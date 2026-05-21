// Secondary Folder Tree — pure vanilla-DOM panel renderer.
//
// Bundling React inside an extension that already runs *inside* a
// React app would duplicate the runtime. We render plain DOM nodes
// into the container the host hands us, wire event listeners on
// `click`/`dblclick` ourselves, and return a cleanup callback that
// detaches every listener + clears the container.
//
// The panel surface ("right") is declared in manifest.json; the host
// auto-renders a status-bar button that toggles the panel. The tree
// always mirrors the active workspace folder — there is no
// per-extension default-path setting (intentional: we don't want the
// Settings card to clutter). When the workspace changes, the tree
// refreshes via `ctx.app.onContextChange`.
//
// A `Mod+Shift+E` keyboard shortcut is contributed declaratively
// (`contributes.commands` + `contributes.keybindings`) and bound to
// `ctx.panel.toggle("tree")` via `ctx.registerCommandHandler`. The
// shortcut shows up in *Settings → Shortcuts → Extensions* and is
// rebindable from there.
//
// Style notes: row chrome (indent depth × 12 px, 13 px text, 0.85
// foreground opacity, accent-tinted hover, chevron that rotates 90 °
// on expand, 14×14 folder/file glyph in the muted foreground color)
// matches TEDI's built-in `FileTreeNode` so the two trees read as
// siblings, not strangers.

// Inline SVG glyphs in the style of HugeIcons stroke icons. Kept
// minimal (folder outline + file outline with the folded corner) so
// the file size stays tiny and the icons paint via `currentColor`
// for theme-aware tinting.
const FOLDER_GLYPH =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>';
const FILE_GLYPH =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>';

export async function activate(ctx) {
  // Single-binding state shared between the renderer and the
  // app-context listener — the latter calls `refresh()` so a
  // workspace change live-updates the open panel.
  const state = {
    container: null,
    treeEl: null,
    rootPath: "",
    expanded: new Set(), // paths of expanded directories
    listeners: [],
  };

  function on(el, type, fn) {
    el.addEventListener(type, fn);
    state.listeners.push(() => el.removeEventListener(type, fn));
  }

  function clearAllListeners() {
    for (const off of state.listeners.splice(0)) {
      try {
        off();
      } catch {
        // ignore
      }
    }
  }

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "style") {
        Object.assign(node.style, v);
      } else if (k === "className") {
        node.className = v;
      } else if (k === "textContent") {
        node.textContent = v;
      } else {
        node.setAttribute(k, String(v));
      }
    }
    for (const c of children) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  async function listDir(path) {
    try {
      const entries = await ctx.invoke("fs_read_dir", { path, includeHidden: false });
      if (!Array.isArray(entries)) return [];
      // Folders first, then files, both alphabetized — matches the
      // built-in explorer convention.
      return entries.slice().sort((a, b) => {
        const ad = a.kind === "dir" ? 0 : 1;
        const bd = b.kind === "dir" ? 0 : 1;
        if (ad !== bd) return ad - bd;
        return a.name.localeCompare(b.name);
      });
    } catch (err) {
      ctx.logger.warn("listDir failed", path, err);
      return null;
    }
  }

  function joinPath(parent, name) {
    if (!parent) return name;
    if (parent.endsWith("/") || parent.endsWith("\\")) return parent + name;
    const sep = parent.includes("\\") && !parent.includes("/") ? "\\" : "/";
    return parent + sep + name;
  }

  // Row chrome lifted from `FileTreeNode.tsx`:
  //   - paddingLeft: 6 + depth * 12
  //   - flex w-full items-center gap-2 px-1.5 py-0.5 text-[13px]
  //   - text-foreground/85 hover:bg-accent/60 cursor-pointer
  // We can't reach the Tailwind utility soup from a runtime-loaded
  // extension, so we restate the same values via inline style + the
  // CSS variables TEDI's theme exposes (`--foreground`, `--accent`,
  // `--muted-foreground`). Result is visually identical to the
  // left-side explorer.
  function makeRow({ name, isDir, depth, isExpanded, onClick, onDouble }) {
    const row = el("div", {
      style: {
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: "8px",
        paddingLeft: `${6 + depth * 12}px`,
        paddingRight: "6px",
        paddingTop: "2px",
        paddingBottom: "2px",
        fontSize: "13px",
        lineHeight: "1.4",
        color: "var(--foreground)",
        opacity: "0.85",
        cursor: "pointer",
        userSelect: "none",
        transition: "background-color 120ms, opacity 120ms",
      },
    });
    const chevron = el("span", {
      style: {
        display: "inline-flex",
        width: "14px",
        height: "14px",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted-foreground)",
        opacity: isDir ? "1" : "0",
        flexShrink: "0",
        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 120ms",
        fontSize: "10px",
      },
      textContent: "▶",
    });
    // 14 × 14 SVG glyph in the muted-foreground color. Matches the
    // ≈16 px column FileExplorer reserves for its Material icons so
    // labels at the same `depth` align between the two trees.
    const glyph = el("span", {
      style: {
        display: "inline-flex",
        width: "14px",
        height: "14px",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted-foreground)",
        flexShrink: "0",
      },
    });
    glyph.innerHTML = isDir ? FOLDER_GLYPH : FILE_GLYPH;
    const label = el("span", {
      style: {
        flex: "1",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      textContent: name,
    });
    row.appendChild(chevron);
    row.appendChild(glyph);
    row.appendChild(label);
    on(row, "mouseenter", () => {
      // `--accent` is the same token the built-in row uses. We dim it
      // to ~60 % via rgba mix so the hover is a touch lighter than a
      // selected state would be.
      row.style.background = "color-mix(in oklab, var(--accent) 60%, transparent)";
      row.style.opacity = "1";
    });
    on(row, "mouseleave", () => {
      row.style.background = "transparent";
      row.style.opacity = "0.85";
    });
    if (onClick) on(row, "click", onClick);
    if (onDouble) on(row, "dblclick", onDouble);
    return { row, chevron };
  }

  async function renderEntries(parentPath, ulEl, depth, entries) {
    for (const entry of entries) {
      const fullPath = joinPath(parentPath, entry.name);
      const isDir = entry.kind === "dir";
      const wasExpanded = state.expanded.has(fullPath);
      let childrenWrap = null;

      const { row, chevron } = makeRow({
        name: entry.name,
        isDir,
        depth,
        isExpanded: wasExpanded,
        onClick: async () => {
          if (!isDir) {
            void ctx.events.emit("open-path", { path: fullPath, kind: entry.kind });
            return;
          }
          if (childrenWrap) {
            const open = childrenWrap.style.display !== "none";
            childrenWrap.style.display = open ? "none" : "block";
            chevron.style.transform = open ? "rotate(0deg)" : "rotate(90deg)";
            if (open) state.expanded.delete(fullPath);
            else state.expanded.add(fullPath);
            return;
          }
          chevron.style.transform = "rotate(90deg)";
          state.expanded.add(fullPath);
          childrenWrap = el("div");
          ulEl.insertBefore(childrenWrap, row.nextSibling);
          const next = await listDir(fullPath);
          if (next === null) {
            childrenWrap.appendChild(
              el("div", {
                style: {
                  paddingLeft: `${6 + (depth + 1) * 12 + 22}px`,
                  paddingTop: "2px",
                  paddingBottom: "2px",
                  fontSize: "11px",
                  color: "var(--destructive, #f88)",
                },
                textContent: "Read failed",
              }),
            );
            return;
          }
          if (next.length === 0) {
            childrenWrap.appendChild(
              el("div", {
                style: {
                  paddingLeft: `${6 + (depth + 1) * 12 + 22}px`,
                  paddingTop: "2px",
                  paddingBottom: "2px",
                  fontSize: "11px",
                  color: "var(--muted-foreground)",
                  fontStyle: "italic",
                },
                textContent: "(empty)",
              }),
            );
            return;
          }
          await renderEntries(fullPath, childrenWrap, depth + 1, next);
        },
        onDouble: !isDir
          ? () => {
              void ctx.events.emit("open-path", { path: fullPath, kind: entry.kind });
              ctx.ui.toast(`open-path emitted for ${entry.name}`, { variant: "info" });
            }
          : undefined,
      });
      ulEl.appendChild(row);

      // If this directory was expanded in the previous render, restore
      // its children synchronously so refresh() doesn't visually
      // collapse the user's selection.
      if (isDir && wasExpanded) {
        childrenWrap = el("div");
        ulEl.insertBefore(childrenWrap, row.nextSibling);
        const next = await listDir(fullPath);
        if (next && next.length > 0) {
          await renderEntries(fullPath, childrenWrap, depth + 1, next);
        }
      }
    }
  }

  async function renderRoot() {
    const treeEl = state.treeEl;
    if (!treeEl) return;
    treeEl.replaceChildren();
    const rootPath = state.rootPath;
    if (!rootPath) {
      treeEl.appendChild(
        el("div", {
          style: {
            paddingLeft: "12px",
            paddingTop: "12px",
            paddingRight: "12px",
            fontSize: "11px",
            color: "var(--muted-foreground)",
            textAlign: "center",
          },
          textContent: "Open a workspace folder to populate the tree.",
        }),
      );
      return;
    }
    const entries = await listDir(rootPath);
    if (entries === null) {
      treeEl.appendChild(
        el("div", {
          style: {
            paddingLeft: "12px",
            paddingTop: "12px",
            paddingRight: "12px",
            fontSize: "11px",
            color: "var(--destructive, #f88)",
            textAlign: "center",
          },
          textContent: `Could not read ${rootPath}`,
        }),
      );
      return;
    }
    await renderEntries(rootPath, treeEl, 0, entries);
  }

  function build(container) {
    container.replaceChildren();
    state.container = container;

    const tree = el("div", {
      style: {
        flex: "1",
        overflow: "auto",
        paddingTop: "4px",
        paddingBottom: "4px",
      },
    });

    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.height = "100%";
    container.appendChild(tree);
    state.treeEl = tree;
  }

  async function refresh() {
    state.rootPath = ctx.app.getContext().workspaceCwd ?? "";
    // Reset expansion state on workspace change so we don't leak
    // stale ancestors across roots.
    state.expanded.clear();
    await renderRoot();
  }

  // Bind the manifest-contributed `toggle` command to the panel store
  // via the host's imperative API. The matching keybinding (default
  // `Mod+Shift+E`) lands here through TEDI's generic
  // useExtensionShortcuts dispatcher; users can rebind it from
  // Settings → Shortcuts → Extensions without touching this file.
  ctx.registerCommandHandler("tedi.secondary-folder-tree.toggle", () => {
    ctx.panel.toggle("tree");
  });

  const disposeRenderer = ctx.registerPanelRenderer("tree", (container) => {
    build(container);
    void refresh();
    return () => {
      clearAllListeners();
      state.container = null;
      state.treeEl = null;
      state.expanded.clear();
      try {
        container.replaceChildren();
      } catch {
        // ignore
      }
    };
  });

  const disposeContext = ctx.app.onContextChange((next) => {
    // Only refresh when the workspace cwd changes; ignore active-file
    // or terminal-count churn so we don't redraw on every keystroke.
    if (!state.treeEl) return;
    if (next.workspaceCwd === state.rootPath) return;
    void refresh();
  });

  ctx.addDisposer(disposeRenderer);
  ctx.addDisposer(disposeContext);
}

export function deactivate() {
  // All resources tied to disposers — registerPanelRenderer +
  // app.onContextChange — are released by the host automatically.
}

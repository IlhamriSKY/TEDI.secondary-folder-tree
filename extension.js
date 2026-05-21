// Secondary Folder Tree — pure vanilla-DOM panel renderer.
//
// Bundling React inside an extension that already runs *inside* a
// React app would duplicate the runtime. We render plain DOM nodes
// into the container the host hands us, wire event listeners on
// `mousedown`/`click` ourselves, and return a cleanup callback that
// detaches every listener + clears the container.
//
// The panel surface ("right") is declared in manifest.json; the host
// auto-renders a status-bar button that toggles the panel. Default
// folder + auto-open are surfaced as `contributes.settings` entries,
// so the user can change them from Settings → Extensions without us
// shipping our own settings UI.

export async function activate(ctx) {
  // Single-binding state shared between the renderer and the
  // settings.onChange listener — the latter calls `refresh()` so a
  // path change inside the Settings card live-updates the open panel.
  const state = {
    container: null,
    rootInput: null,
    rootPath: "",
    nodes: new Map(), // path -> { entries, ulEl, parentLiEl }
    listeners: [],
  };

  // Resolve default path lazily so it picks up the user's edits during
  // the session without forcing a panel remount.
  async function resolveRootPath() {
    const explicit = await ctx.settings.get("defaultPath");
    if (typeof explicit === "string" && explicit.trim().length > 0) {
      return explicit.trim();
    }
    // Fall back to workspaceCwd (the folder the active terminal sits
    // in). Better than nothing for a brand-new install.
    const app = ctx.app.getContext();
    return app.workspaceCwd ?? "";
  }

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
      } else if (k === "dataset") {
        for (const [dk, dv] of Object.entries(v)) {
          node.dataset[dk] = String(dv);
        }
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
    // Match the parent's separator convention so Windows paths stay
    // backslash-clean.
    const sep = parent.includes("\\") && !parent.includes("/") ? "\\" : "/";
    return parent + sep + name;
  }

  function basename(path) {
    const parts = path.split(/[\\/]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : path;
  }

  function makeRow({ name, isDir, depth, onToggle, onActivate }) {
    const indent = el("span", {
      style: { width: `${depth * 12}px`, display: "inline-block", flexShrink: "0" },
    });
    const chevron = el("span", {
      className: "ext-sft-chevron",
      style: {
        width: "14px",
        textAlign: "center",
        opacity: isDir ? "0.7" : "0",
        userSelect: "none",
      },
      textContent: isDir ? "▸" : "·",
    });
    const icon = el("span", {
      style: { width: "14px", textAlign: "center", opacity: "0.85" },
      textContent: isDir ? "📁" : "📄",
    });
    const label = el("span", {
      className: "ext-sft-label",
      style: {
        flex: "1",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      textContent: name,
    });
    const row = el(
      "div",
      {
        className: "ext-sft-row",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          fontSize: "12px",
          cursor: isDir ? "pointer" : "default",
          borderRadius: "3px",
        },
      },
      [indent, chevron, icon, label],
    );
    on(row, "mouseenter", () => {
      row.style.background = "var(--accent, rgba(255,255,255,0.06))";
    });
    on(row, "mouseleave", () => {
      row.style.background = "transparent";
    });
    if (isDir && onToggle) {
      on(row, "click", () => onToggle(chevron));
    }
    if (!isDir && onActivate) {
      on(row, "dblclick", onActivate);
    }
    return { row, chevron };
  }

  async function renderRoot(rootPath) {
    state.rootPath = rootPath;
    state.nodes.clear();
    const treeEl = state.treeEl;
    if (!treeEl) return;
    treeEl.replaceChildren();

    if (!rootPath) {
      treeEl.appendChild(
        el("div", {
          style: {
            padding: "16px",
            fontSize: "11px",
            opacity: "0.65",
            textAlign: "center",
          },
          textContent: "Set a default folder in Settings → Extensions, or paste a path above.",
        }),
      );
      return;
    }

    const entries = await listDir(rootPath);
    if (entries === null) {
      treeEl.appendChild(
        el("div", {
          style: {
            padding: "16px",
            fontSize: "11px",
            color: "var(--destructive, #f88)",
            textAlign: "center",
          },
          textContent: `Could not read ${rootPath}`,
        }),
      );
      return;
    }
    const ul = el("div", { className: "ext-sft-children" });
    treeEl.appendChild(ul);
    state.nodes.set(rootPath, { entries, ulEl: ul });
    await renderEntries(rootPath, ul, 0, entries);
  }

  async function renderEntries(parentPath, ulEl, depth, entries) {
    for (const entry of entries) {
      const fullPath = joinPath(parentPath, entry.name);
      const isDir = entry.kind === "dir";
      let childrenWrap = null;
      const { row, chevron } = makeRow({
        name: entry.name,
        isDir,
        depth,
        onToggle: async () => {
          if (childrenWrap) {
            const open = childrenWrap.style.display !== "none";
            childrenWrap.style.display = open ? "none" : "block";
            chevron.textContent = open ? "▸" : "▾";
            return;
          }
          chevron.textContent = "▾";
          childrenWrap = el("div", { className: "ext-sft-children" });
          ulEl.insertBefore(childrenWrap, row.nextSibling);
          const next = await listDir(fullPath);
          if (next === null) {
            childrenWrap.appendChild(
              el("div", {
                style: {
                  padding: `4px 8px 4px ${(depth + 1) * 12 + 12}px`,
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
                  padding: `4px 8px 4px ${(depth + 1) * 12 + 12}px`,
                  fontSize: "11px",
                  opacity: "0.5",
                },
                textContent: "(empty)",
              }),
            );
            return;
          }
          await renderEntries(fullPath, childrenWrap, depth + 1, next);
        },
        onActivate: () => {
          // Emit a namespaced event so other extensions (or future
          // host bridges) can wire "open in editor" without us
          // tying directly to a built-in invoke that may move.
          void ctx.events.emit("open-path", { path: fullPath, kind: entry.kind });
          ctx.ui.toast(`Path copied to event bus: ${basename(fullPath)}`, { variant: "info" });
        },
      });
      ulEl.appendChild(row);
    }
  }

  function build(container) {
    container.replaceChildren();
    state.container = container;

    const header = el(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px",
          borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
        },
      },
      [],
    );
    const input = el("input", {
      type: "text",
      placeholder: "Folder path",
      style: {
        flex: "1",
        background: "var(--input, rgba(255,255,255,0.04))",
        border: "1px solid var(--border, rgba(255,255,255,0.08))",
        borderRadius: "4px",
        color: "inherit",
        font: "inherit",
        fontSize: "12px",
        padding: "4px 6px",
        outline: "none",
      },
    });
    const openBtn = el("button", {
      type: "button",
      textContent: "Open",
      style: {
        background: "var(--secondary, rgba(255,255,255,0.06))",
        border: "1px solid var(--border, rgba(255,255,255,0.08))",
        borderRadius: "4px",
        color: "inherit",
        font: "inherit",
        fontSize: "11px",
        padding: "4px 10px",
        cursor: "pointer",
      },
    });
    const saveBtn = el("button", {
      type: "button",
      textContent: "Save default",
      title: "Save current path as the default folder",
      style: {
        background: "var(--secondary, rgba(255,255,255,0.06))",
        border: "1px solid var(--border, rgba(255,255,255,0.08))",
        borderRadius: "4px",
        color: "inherit",
        font: "inherit",
        fontSize: "11px",
        padding: "4px 10px",
        cursor: "pointer",
      },
    });
    header.appendChild(input);
    header.appendChild(openBtn);
    header.appendChild(saveBtn);

    const tree = el("div", {
      style: {
        flex: "1",
        overflow: "auto",
        padding: "4px 0",
      },
    });

    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.height = "100%";
    container.appendChild(header);
    container.appendChild(tree);

    state.rootInput = input;
    state.treeEl = tree;

    on(openBtn, "click", () => {
      const path = input.value.trim();
      if (!path) {
        ctx.ui.toast("Enter a folder path first", { variant: "warning" });
        return;
      }
      void renderRoot(path);
    });
    on(input, "keydown", (event) => {
      if (event.key === "Enter") {
        openBtn.click();
      }
    });
    on(saveBtn, "click", async () => {
      const path = input.value.trim();
      try {
        await ctx.settings.set("defaultPath", path);
        ctx.ui.toast("Saved as default folder", { variant: "success" });
      } catch (err) {
        ctx.logger.error("save default failed", err);
        ctx.ui.toast("Could not save default path", { variant: "error" });
      }
    });
  }

  async function bootRoot() {
    const rootPath = await resolveRootPath();
    if (state.rootInput) state.rootInput.value = rootPath;
    await renderRoot(rootPath);
  }

  const disposeRenderer = ctx.registerPanelRenderer("tree", (container) => {
    build(container);
    void bootRoot();
    return () => {
      clearAllListeners();
      state.container = null;
      state.rootInput = null;
      state.treeEl = null;
      state.nodes.clear();
      try {
        container.replaceChildren();
      } catch {
        // ignore
      }
    };
  });

  const disposeSettingsListener = ctx.settings.onChange("defaultPath", () => {
    // Re-read setting + re-render. If the panel is currently closed
    // (no container mounted), the next open re-runs `bootRoot` and
    // picks up the new value naturally.
    if (state.container && state.treeEl) void bootRoot();
  });

  ctx.addDisposer(disposeRenderer);
  ctx.addDisposer(disposeSettingsListener);
}

export function deactivate() {
  // All resources tied to disposers — registerPanelRenderer +
  // settings.onChange — are released by the host automatically. We
  // keep this export so the host's `deactivate` lifecycle hook fires
  // and any future extension-side teardown has a place to live.
}

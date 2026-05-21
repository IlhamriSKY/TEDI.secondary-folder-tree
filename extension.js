// Secondary Folder Tree — thin wrapper around TEDI's built-in
// `FileExplorer`, mounted via `ctx.ui.mountFolderTree`.
//
// Reusing the core component means the secondary tree gets every
// behavior the left sidebar has — Material icons, indentation,
// expand/collapse, click-to-open (routed through the workspace
// bridge), context menu, rename, refresh — without us reimplementing
// any of it. The two trees are visually indistinguishable because
// they ARE the same component.
//
// The panel surface ("right") is declared in manifest.json; the host
// auto-renders a status-bar button that toggles the panel. The
// `Mod+Shift+E` shortcut is contributed declaratively and is
// rebindable from Settings → Shortcuts → Extensions.

export async function activate(ctx) {
  // Guard against older TEDI builds that predate the host APIs this
  // extension needs. The Discord reference handles missing host
  // backends the same way — fire one warning toast, short-circuit
  // activation, leave disable/uninstall working. The user lands on
  // a clear "you need to update TEDI" instead of a stack trace in
  // the dev-tools console.
  const missing = [];
  if (typeof ctx.ui?.mountFolderTree !== "function") missing.push("ctx.ui.mountFolderTree");
  if (typeof ctx.panel?.toggle !== "function") missing.push("ctx.panel.toggle");
  if (typeof ctx.registerPanelRenderer !== "function") missing.push("ctx.registerPanelRenderer");
  if (missing.length > 0) {
    const msg = `Secondary Folder Tree needs a newer TEDI (missing: ${missing.join(", ")}).`;
    ctx.logger.warn(msg);
    try {
      ctx.ui?.toast?.(msg, { variant: "warning" });
    } catch {
      // Even `toast` may not exist on very old hosts; ignore.
    }
    return; // Stay activated-but-idle so disable/uninstall still tears down cleanly.
  }

  // Track the mount handle so we can pass workspace-cwd updates
  // through `update()` instead of remount-and-lose-expansion.
  const state = {
    mounted: null, // MountedFolderTree | null
    rootPath: ctx.app.getContext().workspaceCwd ?? null,
  };

  // Bind the manifest-contributed `toggle` command to the panel store
  // via the host's imperative API. The matching keybinding (default
  // `Mod+Shift+E`) lands here through TEDI's generic
  // useExtensionShortcuts dispatcher; users can rebind it from
  // Settings → Shortcuts → Extensions without touching this file.
  ctx.registerCommandHandler("tedi.secondary-folder-tree.toggle", () => {
    ctx.panel.toggle("tree");
  });

  const disposeRenderer = ctx.registerPanelRenderer("tree", (container) => {
    state.mounted = ctx.ui.mountFolderTree(container, {
      rootPath: state.rootPath,
      // Inject the "Open Folder" picker into the existing FileExplorer
      // header (single compact row: folder-icon + name on the left,
      // action icons on the right). Pair with `hideHostHeader: true`
      // in the manifest so the host doesn't render a competing
      // title strip above it.
      showOpenFolder: true,
      // Close button lives in the header action row alongside the
      // other icons. The host's title strip is suppressed via the
      // manifest's `hideHostHeader: true`, so this is the only way
      // the user closes the panel besides the status-bar toggle.
      onClose: () => ctx.panel.close("tree"),
      // Omitting `onOpenFile` routes the click through the host's
      // workspace bridge → openFileTab → editor tab, same as the
      // left explorer. Drag-from-tree → drop-on-terminal is wired
      // by core (FileTreeNode dragstart + TerminalPane drop) so no
      // extension code is needed for that path.
    });
    return () => {
      try {
        state.mounted?.dispose();
      } finally {
        state.mounted = null;
      }
    };
  });

  // Refresh the tree when the active workspace folder changes. The
  // mount API exposes `update()` so we can swap rootPath without
  // tearing down React state.
  const disposeContext = ctx.app.onContextChange((next) => {
    const cwd = next.workspaceCwd ?? null;
    if (cwd === state.rootPath) return;
    state.rootPath = cwd;
    state.mounted?.update({ rootPath: cwd });
  });

  ctx.addDisposer(disposeRenderer);
  ctx.addDisposer(disposeContext);
}

export function deactivate() {
  // All resources tied to disposers — registerPanelRenderer +
  // app.onContextChange — are released by the host automatically.
}

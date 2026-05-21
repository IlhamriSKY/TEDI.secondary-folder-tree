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
      // Omitting `onOpenFile` routes the click through the host's
      // workspace bridge → openFileTab → editor tab, same as the
      // left explorer.
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

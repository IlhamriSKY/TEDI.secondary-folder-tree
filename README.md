# TEDI Secondary Folder Tree

Adds a **second folder tree** to [TEDI](https://github.com/IlhamriSKY/TEDI),
sliding in from the right of the workspace next to the AI Agent panel.
The tree is TEDI's built-in `FileExplorer` mounted via
`ctx.ui.mountFolderTree`, so icons, indentation, expand / collapse, and
click-to-open all match the left sidebar pixel-for-pixel.

<p align="center">
  <img src="logo.png" alt="Secondary Folder Tree" width="128" />
</p>

> [!NOTE]
> The toggle button auto-appears in the status bar's right cluster
> the moment the extension activates. Default shortcut `Mod+Shift+E`
> toggles the panel (rebindable in *Settings → Shortcuts →
> Extensions*). The panel shares its slot with the AI Agent sidebar;
> opening one auto-closes the other.

---

## Install

1. Open **Settings → Extensions** in TEDI.
2. Switch to the **From GitHub** tab.
3. Paste `IlhamriSKY/TEDI.secondary-folder-tree` and click **Review → Install**.

## Update

In **Settings → Extensions**, click **Check updates** on this extension's
card. If a new release exists, click **Update** to reinstall in place.

## How it works

```
TEDI status bar
    │ click "Secondary Folder"
    ▼
useRightPanelStore.toggle(extId, "tree")
    │ App.tsx auto-closes the AI sidebar if it was open
    ▼
<ResizablePanel id="right-slot">
    │ <RightPanelHost> mounts a fresh <div>
    ▼
ctx.registerPanelRenderer("tree", (container) => { … })
    │ this extension's renderer paints into the container
    ▼
ctx.ui.mountFolderTree(container, { rootPath, onOpenFile, … })
    │ TEDI's built-in FileExplorer is mounted into the slot
```

On activate the extension:

1. Resolves the workspace cwd via `ctx.app.getContext().workspaceCwd`.
2. Calls `ctx.registerPanelRenderer("tree", renderFn)`.
3. Subscribes to `ctx.app.onContextChange` so workspace changes
   live-refresh the open panel.

On disable / uninstall, the renderer's cleanup callback runs and the
slot closes. No core TEDI code is folder-tree-aware.

## Permissions

| Permission | Why |
| --- | --- |
| `panels:register` | Declare the right-panel + register the renderer. |
| `ui:toast` | Surface workspace-change notices. |

No filesystem, keychain, network, or shell permissions — the tree
reads directories through TEDI's existing `FileExplorer` host
component.

## Development

```bash
git clone https://github.com/IlhamriSKY/TEDI.secondary-folder-tree.git
cd TEDI.secondary-folder-tree

# Package + install via Settings → Extensions → From file:
zip dev.zip manifest.json extension.js logo.png README.md LICENSE
```

To cut a release, tag `vX.Y.Z` and push. The CI in
[`.github/workflows/release.yml`](.github/workflows/release.yml) builds
the release zip and creates the GitHub release.

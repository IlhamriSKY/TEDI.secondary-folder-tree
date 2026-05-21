# TEDI Secondary Folder Tree

Companion extension for [TEDI](https://github.com/IlhamriSKY/TEDI) that
adds a **second folder tree** sliding in from the right of the
workspace, mutual-exclusive with the AI Agent sidebar. The tree is
TEDI's built-in `FileExplorer` mounted via `ctx.ui.mountFolderTree`,
so icons / indentation / expand-collapse / click-to-open match the
left sidebar pixel-for-pixel — they are literally the same React
component.

<p align="center">
  <img src="logo.png" alt="Secondary Folder Tree" width="128" />
</p>

> [!NOTE]
> The toggle button auto-appears in the status bar's right cluster
> (next to **Open AI Agent**) the moment the extension activates — no
> manual layout wiring. Clicking it while the AI panel is open
> auto-closes AI, and vice versa; whichever you opened last wins the
> ~22% right slice of the workspace. The button hides while the
> panel is open, just like the AI Agent affordance.
>
> A default shortcut `Mod+Shift+E` toggles the panel — rebindable
> from *Settings → Shortcuts → Extensions* under the **Secondary
> Folder Tree** group.

---

## Install

In TEDI:

1. Open **Settings → Extensions**.
2. Switch to the **From GitHub** tab.
3. Paste `IlhamriSKY/TEDI.secondary-folder-tree` (or the full URL).
4. Click **Review → Install**.

That's it. No manual settings to flip. The extension registers a
right-panel renderer with TEDI's generic extension API at activate;
from then on the **Secondary Folder** button is wired into the status
bar until you disable or uninstall.

TEDI hits `releases/latest` on this repo, downloads the `.zip` asset
produced by the [release workflow](.github/workflows/release.yml), runs
its standard install pipeline (size cap, path-traversal guard, manifest
validation, fingerprint), and activates the extension. The card with
this README's logo appears in Settings → Extensions; the card-level
Switch is the only on/off control.

### Updating

The same Settings → Extensions screen has a **Check updates** button.
TEDI compares `tag_name` of the latest GitHub release against the
installed `manifest.version`. If newer, an **Update** button re-runs
the install pipeline against the new release. No manual download.

---

## How it works

```
TEDI status bar
    │
    │  click "Secondary Folder"
    ▼
useRightPanelStore.toggle(extId, "tree")
    │
    │  state coordinator (App.tsx) auto-closes the AI sidebar if it
    │  was open — the two share the same ~22% right slot
    ▼
<ResizablePanel id="right-slot">
    │
    │  <RightPanelHost> mounts a fresh <div> container
    ▼
ctx.registerPanelRenderer("tree", (container) => { … })
    │  (registered by this extension at activate)
    ▼
renderTree(container):  ← vanilla DOM, zero React duplication
    ├── root      ctx.app.getContext().workspaceCwd
    ├── nodes     ctx.invoke("fs_read_dir") per expanded directory
    └── events    click file → ctx.events.emit("open-path", {...})
```

The extension never reaches into TEDI core. On activate it:

1. Resolves the workspace cwd (`ctx.app.getContext().workspaceCwd`).
2. Calls `ctx.registerPanelRenderer("tree", renderFn)` so the host
   knows how to paint the panel when the user clicks the toggle.
3. Subscribes to `ctx.app.onContextChange` so a workspace change
   live-refreshes the open panel.

On deactivate / uninstall, TEDI's extension host automatically runs the
renderer's cleanup callback **and** the panel's own state coordinator
(`App.tsx`) detects the orphaned target and closes the slot. No core
TEDI code is folder-tree-aware.

### Visual style

Row chrome (indent depth × 12 px, 13 px text, 0.85 foreground opacity,
accent-tinted hover, chevron that rotates 90 ° on expand) is lifted
verbatim from TEDI's built-in `FileTreeNode`, restated via inline
style + the CSS variables TEDI's theme exposes (`--foreground`,
`--accent`, `--muted-foreground`). The two trees read as siblings, not
strangers.

### Events

| Event | Payload | When |
| --- | --- | --- |
| `open-path` | `{ path: string, kind: "file"\|"dir"\|"symlink" }` | Double-click on a tree node. Namespaced as `ext://tedi.secondary-folder-tree/open-path`. Other extensions can listen via `ctx.events.on("open-path", …)` (with `events:listen` permission). |

---

## Permissions

Declared in `manifest.json`:

```json
"permissions": [
  "panels:register",
  "ui:toast"
]
```

| Permission                  | What it lets the extension do                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `panels:register`           | Register a runtime renderer for the right-surface panel declared in `contributes.panels[]`. The host auto-renders the matching status-bar toggle button from the manifest. |
| `ui:toast`                  | Reserved for future error reporting (not currently used).                                                    |

Note: directory listing happens inside the core `FileExplorer`
component the extension mounts — the extension never calls
`fs_read_dir` directly, which is why the permission isn't requested.
Click-to-open also goes through the same workspace bridge the left
explorer uses, so no event bus permission is needed either.

---

## Compatibility

Requires TEDI **>= 0.2.15** for the `ctx.registerPanelRenderer` host
API and the `surface: "right"` panel contribution. Older TEDI builds
silently ignore the `right` surface (no toggle button appears); newer
builds wire everything automatically.

---

## Local development

```bash
git clone https://github.com/IlhamriSKY/TEDI.secondary-folder-tree.git
cd TEDI.secondary-folder-tree

# Package + install into TEDI to test:
zip dev.zip manifest.json extension.js logo.png README.md LICENSE
# In TEDI: Settings → Extensions → From file → dev.zip
```

After install, watch TEDI's dev-tools console (`Ctrl+Shift+I`) for
`[ext:tedi.secondary-folder-tree]` log lines (renderer registration,
settings reads, `fs_read_dir` failures if any).

Cut a release with a `vX.Y.Z` tag — the bundled
[`.github/workflows/release.yml`](.github/workflows/release.yml)
asserts the tag matches `manifest.version`, zips
`manifest.json + extension.js + logo.png`, and uploads to the
GitHub release that TEDI's installer reads from `releases/latest`.

```bash
git tag v0.1.3
git push origin v0.1.3
```

# TEDI Secondary Folder Tree

Companion extension for [TEDI](https://github.com/IlhamriSKY/TEDI) that
adds a **second folder tree** sliding in from the right of the
workspace, mutual-exclusive with the AI Agent sidebar. Pin any folder
on disk, expand subdirectories on click, double-click a file to emit
an `open-path` event downstream listeners can wire up.

<p align="center">
  <img src="logo.png" alt="Secondary Folder Tree" width="128" />
</p>

> [!NOTE]
> The toggle button auto-appears in the status bar's right cluster
> (next to **Open AI Agent**) the moment the extension activates — no
> manual layout wiring. Clicking it while the AI panel is open
> auto-closes AI, and vice versa; whichever you opened last wins the
> ~22% right slice of the workspace.

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
    ├── header   path input + Open + Save default
    ├── tree     ctx.invoke("fs_read_dir") per expanded node
    └── events   double-click → ctx.events.emit("open-path", {...})
```

The extension never reaches into TEDI core. On activate it:

1. Resolves the default folder (`ctx.settings.get("defaultPath")` with
   a fallback to `ctx.app.getContext().workspaceCwd`).
2. Calls `ctx.registerPanelRenderer("tree", renderFn)` so the host
   knows how to paint the panel when the user clicks the toggle.
3. Subscribes to `ctx.settings.onChange("defaultPath")` so a path
   change in the Settings card live-updates the open panel.

On deactivate / uninstall, TEDI's extension host automatically runs the
renderer's cleanup callback **and** the panel's own state coordinator
(`App.tsx`) detects the orphaned target and closes the slot. No core
TEDI code is folder-tree-aware.

### Settings

Both settings are also surfaced in *Settings → Extensions → Secondary
Folder Tree* (auto-rendered from `contributes.settings`):

| Setting | Type | Purpose |
| --- | --- | --- |
| **Default folder** | string | Absolute path that the panel opens to on first reveal. Leave empty to fall back to the active workspace folder. |
| **Open on startup** | boolean | When enabled, the panel auto-opens once per session (honors a panel manifest's `defaultOpen: true` exactly once — re-closing in the same session is respected). |

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
  "settings:read",
  "settings:write",
  "invoke:fs_read_dir",
  "ui:toast",
  "events:emit"
]
```

| Permission                  | What it lets the extension do                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `panels:register`           | Register a runtime renderer for the right-surface panel declared in `contributes.panels[]`. The host auto-renders the matching status-bar toggle button from the manifest. |
| `settings:read` / `:write`  | Persist + read the default folder and auto-open toggle, namespaced under `ext:tedi.secondary-folder-tree:*`. |
| `invoke:fs_read_dir`        | List directory entries through TEDI's filesystem command. Single command, no glob over `fs_*`. |
| `ui:toast`                  | Confirm "Saved as default folder" and surface read errors.                                     |
| `events:emit`               | Emit `open-path` on double-click so downstream listeners can wire "open in editor" without us reaching into core. |

No filesystem write access (the extension only reads directories), no
keychain access, no network access, no shell execution. The tree is
strictly read-only.

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
git tag v0.1.0
git push origin v0.1.0
```

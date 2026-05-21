# TEDI · Secondary Folder Tree

A second folder tree, slid in from the right of TEDI's workspace
(mutual-exclusive with the AI Agent sidebar). Pin any folder on disk,
expand subdirectories on click, and keep it open alongside the main
explorer.

> Powered by TEDI's right-panel extension hook (`registerPanelRenderer`).
> Drops in next to the AI Agent button in the status bar — no core
> changes needed.

## Features

- **Pin a default folder.** Saved per-user via TEDI's extension
  settings (`ext:tedi.secondary-folder-tree:defaultPath`). Survives
  restarts.
- **Auto-open on launch.** Optional toggle for users who always want
  the panel visible.
- **Mutual-exclusive with AI.** Clicking the toggle while the AI panel
  is open auto-closes AI, and vice versa. The slot fits both panels;
  whichever you opened last wins.
- **Cheap.** Pure vanilla DOM render — no bundled React, no sidecar
  binaries, ~12 KB JS total.

## Install

| Channel | Steps |
| --- | --- |
| **Settings UI** | Open *Settings → Extensions → From GitHub*, paste `IlhamriSKY/TEDI.secondary-folder-tree`, click **Review → Install**. |
| **CLI** | `tedi ext install IlhamriSKY/TEDI.secondary-folder-tree` |
| **Local .zip** | Grab the `.zip` from the [latest release](https://github.com/IlhamriSKY/TEDI.secondary-folder-tree/releases/latest), then *Settings → Extensions → From file*. |

After install, a "Secondary Folder" button appears in the right
cluster of the status bar (next to *Open AI Agent*). Click it to
toggle the panel.

## Configure

*Settings → Extensions → Secondary Folder Tree*:

- **Default folder** — absolute path the panel opens to on first
  reveal. Leave empty to fall back to the current workspace cwd.
- **Open on startup** — when enabled the panel auto-opens on launch
  (exactly once per session — re-closing in the same session is
  respected).

You can also paste a path into the panel's input and click **Save
default** to persist it.

## Files & permissions

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest (id, permissions, contributions). |
| `extension.js` | ES module with `activate(ctx)` / `deactivate()`. |
| `logo.png` | Icon shown on the status-bar toggle + Settings card. |

Declared permissions and what each unlocks:

| Permission | Why |
| --- | --- |
| `panels:register` | Bind the runtime renderer to the manifest's right-surface panel. |
| `settings:read` / `settings:write` | Persist the default folder + auto-open toggle. |
| `invoke:fs_read_dir` | List the chosen folder via TEDI's filesystem command. |
| `ui:toast` | Notify on save / error. |
| `events:emit` | Emit `open-path` on double-click so downstream listeners can wire "open in editor". |

## Releasing

`.github/workflows/release.yml` runs on every `vX.Y.Z` tag push and:

1. Verifies `manifest.json` version matches the tag.
2. Zips `manifest.json + extension.js + logo.png`.
3. Uploads the asset to the corresponding GitHub release.

That `.zip` is exactly what TEDI's installer reads from
`releases/latest` when users install via *From GitHub*.

```bash
# Cut a release
git tag v0.1.0
git push origin v0.1.0
```

## License

Apache 2.0 — see [LICENSE](./LICENSE).

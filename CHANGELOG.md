# Changelog

All notable changes to **TEDI Secondary Folder Tree**. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [0.1.1] - 21-05-2026

### Changed

- Tree row chrome now mirrors TEDI's built-in `FileTreeNode` (13 px text, 0.85 foreground opacity, indent depth × 12 px, chevron that rotates 90 ° on expand, accent-tinted hover) so the right-side tree reads as a sibling of the left-side `FileExplorer` instead of a one-off layout.
- Status-bar toggle button drops its icon and renders as a text-only pill, matching the **Open AI Agent** affordance next to it.
- Panel root is always the active workspace folder; the workspace-change listener (`ctx.app.onContextChange`) live-refreshes the open tree.

### Removed

- **Default folder** setting (string). The panel always tracks the active workspace cwd; per-extension default paths added clutter without a clear use case.
- **Open on startup** setting (boolean). The manifest's `panels[].defaultOpen` flag (handled by the host) is the single source of truth for auto-open behavior.
- `settings:read` and `settings:write` permissions (no Settings-card knobs to read or persist).

## [0.1.0] - 21-05-2026

### Added

- Initial release. Right-panel TEDI extension that adds a second folder tree to the workspace, mutual-exclusive with the AI Agent sidebar. Pure vanilla-DOM render (no React bundle, no sidecar binary). Auto-renders a status-bar toggle button from `contributes.panels[]` with `surface: "right"`; the renderer is bound at activate via `ctx.registerPanelRenderer("tree", …)`.
- Two extension-scoped settings: **Default folder** (string, persisted under `ext:tedi.secondary-folder-tree:defaultPath`) and **Open on startup** (boolean, honors manifest `defaultOpen: true` once per session). _(removed in 0.1.1.)_
- `open-path` event emitted on double-click, namespaced as `ext://tedi.secondary-folder-tree/open-path`. Downstream extensions can wire "open in editor" with the `events:listen` permission.
- Requires TEDI **>= 0.2.15** for the `ctx.registerPanelRenderer` host API and the `surface: "right"` panel contribution.

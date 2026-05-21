# Changelog

All notable changes to **TEDI Secondary Folder Tree**. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [0.1.0] - 21-05-2026

### Added

- Initial release. Right-panel TEDI extension that adds a second folder tree to the workspace, mutual-exclusive with the AI Agent sidebar. Pure vanilla-DOM render (no React bundle, no sidecar binary). Auto-renders a status-bar toggle button from `contributes.panels[]` with `surface: "right"`; the renderer is bound at activate via `ctx.registerPanelRenderer("tree", …)`.
- Two extension-scoped settings: **Default folder** (string, persisted under `ext:tedi.secondary-folder-tree:defaultPath`) and **Open on startup** (boolean, honors manifest `defaultOpen: true` once per session).
- `open-path` event emitted on double-click, namespaced as `ext://tedi.secondary-folder-tree/open-path`. Downstream extensions can wire "open in editor" with the `events:listen` permission.
- Requires TEDI **>= 0.2.15** for the `ctx.registerPanelRenderer` host API and the `surface: "right"` panel contribution.

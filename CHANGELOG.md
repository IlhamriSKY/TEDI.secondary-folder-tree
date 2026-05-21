# Changelog

All notable changes to **TEDI Secondary Folder Tree**. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [0.1.4] - 21-05-2026

### Added

- **Open Folder** button in the panel toolbar. Click pops the OS folder picker and swaps the tree root to the chosen directory; a reset chip appears next to it to restore the workspace folder in one click. The pick is session-scoped and lost on close (mirrors the AI sidebar's transient state model).

### Changed

- Status-bar toggle button's `<Kbd>` chip now formats with the platform key separator (`Ctrl+Shift+E` on Windows/Linux, `⇧⌃E` on macOS) — matches `AiOpenButton`'s `Ctrl+I` / `⌘I` formatting exactly.

## [0.1.3] - 21-05-2026

### Changed

- **Tree now reuses TEDI's built-in `FileExplorer`** via the new `ctx.ui.mountFolderTree` host API. Icons, indentation, hover, expand/collapse, click-to-open, context menu, rename — all pixel-identical to the left sidebar because the two trees ARE the same React component. Drops ~200 lines of vanilla DOM rendering in `extension.js`.
- Click-to-open routes through TEDI's workspace bridge → editor tab, same path as the left explorer.
- Status-bar toggle button restyled to match `AiOpenButton` exactly (h-6, motion drop-in, hover accent border) and now shows the bound shortcut as a `<Kbd>` chip via the new `panel.toggleCommand` manifest field.

### Removed

- Inline SVG folder/file glyphs in `extension.js` — replaced by the core component's real Material/Catppuccin icons.
- `invoke:fs_read_dir` and `events:emit` permissions. The core component handles directory listing internally; file-open events are routed through the workspace bridge, not the extension event bus.

## [0.1.2] - 21-05-2026

### Added

- Keyboard shortcut: `Mod+Shift+E` toggles the panel. Declared via `contributes.commands` + `contributes.keybindings` and bound to the new `ctx.panel.toggle(panelId)` host helper through `ctx.registerCommandHandler`. Shows up in *Settings → Shortcuts → Extensions* and is rebindable from there (persisted under `preferences.extensionShortcuts`).
- Folder + file glyphs in tree rows (inline SVG in muted-foreground color, 14 × 14 column matching the icon slot in TEDI's built-in `FileTreeNode`). Labels at the same depth now align visually between the secondary tree and the left-side explorer.

### Changed

- Status-bar toggle button now hides while the panel is open — mirrors the `AiOpenButton` behavior (close via the panel header's X). The button reappears the moment the panel closes.

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

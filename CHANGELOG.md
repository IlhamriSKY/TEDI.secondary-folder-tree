# Changelog

All notable changes to **TEDI Secondary Folder Tree**. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [0.1.12] - 2026-07-18

### Changed

- **Documentation.** Project links point at the TEDI website (https://tedi.ilhamriski.com/) in both `manifest.json` and the README, the README follows the structure shared across the TEDI extensions (with the `npm run build` step included in the dev instructions), "How it works" is rendered as a Mermaid diagram, and the changelog dates are normalized to ISO 8601. No behaviour change.

## [0.1.11] - 2026-06-16

### Changed

- **Build pipeline.** The extension is now authored as `src/index.js` and bundled into `extension.js` with esbuild (`npm run build`); the built bundle is **no longer committed** — CI (`release.yml`) builds it into the release `.zip` that users install. No behaviour change. CI actions bumped to `@v5` (Node 24).

## [0.1.10] - 2026-05-28

### Changed

- **`engines.tedi` raised to `>=0.3.9`.** The host now enforces this constraint at install time, so older TEDI builds refuse to install the extension and surface a "needs TEDI X.Y.Z" message rather than letting it run against a host that predates the current API surface.

## [0.1.9] - 2026-05-27

### Fixed

- **"Open Folder" pick now survives close/reopen.** Previously, closing the right panel unmounted the React tree and dropped the user's picker selection, so reopening snapped back to the workspace root. The pick is now held in the extension's activate closure (so close/reopen within a session works) and mirrored to `ctx.storage` (so it survives full app reloads). Cleared automatically on workspace switch.

### Changed

- Bumped host API requirement implicitly: `ctx.ui.mountFolderTree` now accepts `initialPickedPath` + `onPickedPathChange`. Older TEDI builds ignore the unknown options and fall back to the previous reset-on-reopen behavior, so no version gate was added.

## [0.1.8] - 2026-05-26

### Changed

- **Manifest description trimmed.** Reduced to the same "what + how" one-liner the other reference extensions use, so the *Settings → Extensions → From GitHub* install dialog reads cleanly when this card sits alongside SQL Explorer / Beautify / Discord Rich Presence. No runtime behaviour change.

## [0.1.7] - 2026-05-25

### Changed

- **Cosmetic em-dash sweep.** Replaced `—` (U+2014 EM DASH) with `-` (U+002D HYPHEN-MINUS) across `README.md`, `CHANGELOG.md`, and `extension.js` comments. No runtime behaviour change; the JS code paths execute identically to 0.1.6.

## [0.1.6] - 2026-05-21

### Added

- **Graceful degradation on older TEDI hosts** (Discord-reference pattern). Activate now probes for `ctx.ui.mountFolderTree`, `ctx.panel.toggle`, and `ctx.registerPanelRenderer` before using them. If any is missing, the extension fires a single warning toast naming the missing API and stays idle so disable/uninstall still works without errors.

### Changed

- Re-add `ui:toast` permission (was dropped in 0.1.5) so the version-mismatch toast above can surface. Permission is low-risk and used only for transient status messages.

## [0.1.5] - 2026-05-21

### Added

- **Drag a file from the tree onto any terminal pane** to insert its shell-quoted path at the cursor. Works on Windows (PowerShell + cmd double-quote escape), Linux, and macOS (POSIX single-quote escape). The path is appended via `session.write` and the terminal is focused automatically. Useful for piping a file into `claude`, `cat`, `code`, etc., without typing the path manually.

### Changed

- **Compact single-row header.** The panel now reuses `FileExplorer`'s built-in title bar (folder icon + folder name on the left) and injects the **Open Folder**, **Reset**, and **Close** icons after the existing Search/Refresh/Collapse buttons on the right. The host's "Secondary Folder" title strip is hidden via the new `panels[].hideHostHeader: true` manifest flag.
- **Removed clutter:** "New file", "New folder", and "Search in files" (grep) buttons are hidden in the secondary panel via the new `hideCreateActions` + `hideGrep` props on `FileExplorer`. Filename search stays.
- Description in `manifest.json` simplified to one sentence covering what + key shortcut.

### Removed

- `ui:toast` permission (no toast surface is used in v0.1.5).

## [0.1.4] - 2026-05-21

### Added

- **Open Folder** button in the panel toolbar. Click pops the OS folder picker and swaps the tree root to the chosen directory; a reset chip appears next to it to restore the workspace folder in one click. The pick is session-scoped and lost on close (mirrors the AI sidebar's transient state model).

### Changed

- Status-bar toggle button's `<Kbd>` chip now formats with the platform key separator (`Ctrl+Shift+E` on Windows/Linux, `⇧⌃E` on macOS) - matches `AiOpenButton`'s `Ctrl+I` / `⌘I` formatting exactly.

## [0.1.3] - 2026-05-21

### Changed

- **Tree now reuses TEDI's built-in `FileExplorer`** via the new `ctx.ui.mountFolderTree` host API. Icons, indentation, hover, expand/collapse, click-to-open, context menu, rename - all pixel-identical to the left sidebar because the two trees ARE the same React component. Drops ~200 lines of vanilla DOM rendering in `extension.js`.
- Click-to-open routes through TEDI's workspace bridge → editor tab, same path as the left explorer.
- Status-bar toggle button restyled to match `AiOpenButton` exactly (h-6, motion drop-in, hover accent border) and now shows the bound shortcut as a `<Kbd>` chip via the new `panel.toggleCommand` manifest field.

### Removed

- Inline SVG folder/file glyphs in `extension.js` - replaced by the core component's real Material/Catppuccin icons.
- `invoke:fs_read_dir` and `events:emit` permissions. The core component handles directory listing internally; file-open events are routed through the workspace bridge, not the extension event bus.

## [0.1.2] - 2026-05-21

### Added

- Keyboard shortcut: `Mod+Shift+E` toggles the panel. Declared via `contributes.commands` + `contributes.keybindings` and bound to the new `ctx.panel.toggle(panelId)` host helper through `ctx.registerCommandHandler`. Shows up in *Settings → Shortcuts → Extensions* and is rebindable from there (persisted under `preferences.extensionShortcuts`).
- Folder + file glyphs in tree rows (inline SVG in muted-foreground color, 14 × 14 column matching the icon slot in TEDI's built-in `FileTreeNode`). Labels at the same depth now align visually between the secondary tree and the left-side explorer.

### Changed

- Status-bar toggle button now hides while the panel is open - mirrors the `AiOpenButton` behavior (close via the panel header's X). The button reappears the moment the panel closes.

## [0.1.1] - 2026-05-21

### Changed

- Tree row chrome now mirrors TEDI's built-in `FileTreeNode` (13 px text, 0.85 foreground opacity, indent depth × 12 px, chevron that rotates 90 ° on expand, accent-tinted hover) so the right-side tree reads as a sibling of the left-side `FileExplorer` instead of a one-off layout.
- Status-bar toggle button drops its icon and renders as a text-only pill, matching the **Open AI Agent** affordance next to it.
- Panel root is always the active workspace folder; the workspace-change listener (`ctx.app.onContextChange`) live-refreshes the open tree.

### Removed

- **Default folder** setting (string). The panel always tracks the active workspace cwd; per-extension default paths added clutter without a clear use case.
- **Open on startup** setting (boolean). The manifest's `panels[].defaultOpen` flag (handled by the host) is the single source of truth for auto-open behavior.
- `settings:read` and `settings:write` permissions (no Settings-card knobs to read or persist).

## [0.1.0] - 2026-05-21

### Added

- Initial release. Right-panel TEDI extension that adds a second folder tree to the workspace, mutual-exclusive with the AI Agent sidebar. Pure vanilla-DOM render (no React bundle, no sidecar binary). Auto-renders a status-bar toggle button from `contributes.panels[]` with `surface: "right"`; the renderer is bound at activate via `ctx.registerPanelRenderer("tree", …)`.
- Two extension-scoped settings: **Default folder** (string, persisted under `ext:tedi.secondary-folder-tree:defaultPath`) and **Open on startup** (boolean, honors manifest `defaultOpen: true` once per session). _(removed in 0.1.1.)_
- `open-path` event emitted on double-click, namespaced as `ext://tedi.secondary-folder-tree/open-path`. Downstream extensions can wire "open in editor" with the `events:listen` permission.
- Requires TEDI **>= 0.2.15** for the `ctx.registerPanelRenderer` host API and the `surface: "right"` panel contribution.

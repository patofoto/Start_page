# Tabbed Settings & Background Picker — Design Spec

## Goal

Replace the single-scroll settings modal with a tabbed settings panel using a macOS-style sidebar layout. Add a new Appearance tab with a wallpaper picker (preset thumbnails + custom URL).

## Architecture

The settings modal becomes a sidebar + content panel layout using CSS grid. The sidebar lists four tabs; clicking a tab swaps the visible content section. All sections share a single Save/Close footer. Background image URL is stored as `appData.backgroundUrl` and applied as an inline `background-image` on `<body>`, overriding the CSS variable default.

## Tabs

| Tab | Contents |
|-----|----------|
| **Appearance** | Wallpaper picker (preset thumbnails + custom URL input) |
| **Google Apps** | Toggles for which apps appear in the launcher |
| **Account** | Allowed emails, hide-when-logged-out checkbox |
| **Data** | JSON editor, copy JSON button, reset defaults |

## Appearance Tab — Wallpaper Picker

### Preset Wallpapers

5-6 preset wallpapers displayed as a thumbnail grid (3 columns on desktop, 2 on mobile). Each preset is an object with:

```js
{ id: 'warm-nature', name: 'Warm Nature', url: 'https://images.unsplash.com/...' }
```

The presets are hardcoded in `script.js` (not stored in KV). The current background's URL is stored in `appData.backgroundUrl`.

### Selection UI

- Selected wallpaper gets a blue border (`#007aff`) and a checkmark badge (bottom-right corner)
- Clicking a preset selects it immediately (preview updates live)
- The current wallpaper (from `appData.backgroundUrl`) is matched against presets; if it matches, that preset is highlighted. If it doesn't match any preset, the "Custom" tile shows as selected

### Custom URL

- A "+" dashed-border tile at the end of the grid
- Clicking it reveals an inline input below the grid with an Apply button
- If `appData.backgroundUrl` doesn't match any preset, the custom URL input is pre-populated and the "+" tile shows as selected
- Apply sets the background immediately as a preview

### Data Model

```js
// Added to appData (saved to KV)
appData.backgroundUrl = "https://images.unsplash.com/photo-..."
```

- If `backgroundUrl` is `null`/`undefined`, the CSS variable default (`--bg-image-url`) is used
- On load, if `backgroundUrl` exists, set `document.body.style.backgroundImage = url(...)`

## Layout

### Desktop (> 640px)

```
┌─────────────────────────────────────────────┐
│ ┌───────────┐ ┌───────────────────────────┐ │
│ │ Appearance│ │                           │ │
│ │ Google App│ │   Tab content area        │ │
│ │ Account   │ │                           │ │
│ │ Data      │ │                           │ │
│ │           │ │                           │ │
│ └───────────┘ │                           │ │
│               ├───────────────────────────┤ │
│               │        Close    Save      │ │
│               └───────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- Panel: frosted glass (same style as edit group modal)
- Sidebar: 180px, subtle grey background, blue highlight on active tab
- Content: scrollable independently
- Footer: pinned at bottom of content area

### Mobile (≤ 640px)

- Full-screen panel (same as edit group modal mobile)
- Sidebar becomes horizontal scrolling tabs at the top
- Footer becomes iOS-style tab bar at bottom with Save and Close

## CSS Structure

All settings-specific styles scoped under `#settings-modal`. The panel uses CSS grid:

```css
.settings-panel {
  display: grid;
  grid-template-columns: 180px 1fr;  /* sidebar + content */
  grid-template-rows: 1fr auto;       /* content + footer */
}
```

Mobile override switches to `grid-template-columns: 1fr` with horizontal tabs as a separate row.

## JS Changes

### Settings Modal Open/Close

`openSettingsModal()` and `closeSettingsModal()` remain. Inside `openSettingsModal()`, the first tab (Appearance) is selected by default.

### Tab Switching

A `switchSettingsTab(tabName)` function:
- Hides all `.settings-tab-content` sections
- Shows the one matching `data-tab="tabName"`
- Updates sidebar active state

### Background Application

On page load (`init()`), after loading data:
```js
if (appData.backgroundUrl) {
  document.body.style.backgroundImage = `url('${appData.backgroundUrl}')`;
}
```

On save, the selected wallpaper URL is written to `appData.backgroundUrl`.

### Save Flow

The existing save-settings handler is kept. It gathers data from all tabs (not just the visible one) and saves everything at once. New fields gathered:
- `appData.backgroundUrl` from the wallpaper selection state

## Preset Wallpapers List

```js
const PRESET_WALLPAPERS = [
  { id: 'warm-nature', name: 'Warm Nature', url: 'https://images.unsplash.com/photo-1460500063983-994d4c27756c?w=1920&q=80' },
  { id: 'dark-ocean', name: 'Dark Ocean', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80' },
  { id: 'twilight', name: 'Twilight', url: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1920&q=80' },
  { id: 'mountains', name: 'Mountains', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
  { id: 'charcoal', name: 'Charcoal', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80' },
];
```

The current default wallpaper (warm nature) is the first preset. Exact Unsplash URLs may be adjusted during implementation.

## What Doesn't Change

- Settings button visibility logic (auth-gated)
- Close-on-outside-click behavior for settings modal
- KV storage format (backgroundUrl is just another field on appData)
- Other modals (add group, edit group, move group) are untouched

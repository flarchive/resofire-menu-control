# resofire/menu-control

A Flarum extension that gives admins full control over the sidebar navigation on the forum index page — reorder items, flip the layout, customize icons, highlight items for users, and more.

---

## Features

### Navigation Order
Reorder all sidebar nav items (All Discussions, Tags, Following, User Directory, third-party extension links, etc.) using the up/down arrow buttons in the admin panel. The order updates immediately after saving.

### Flip Navigation
Moves tag links to the top of the sidebar and pushes nav items (All Discussions, Following, etc.) below them. Applies on all screen sizes.

### Sticky Sidebar
Keeps the sidebar fixed at the top of the viewport as the user scrolls down the discussion list. Desktop only.

### Custom Icons
Each nav item has a text input in the admin panel where you can type any Font Awesome icon class (e.g. `fas fa-bolt`). Leave the input empty to use the extension's default icon. Icons update on the forum immediately after saving.

### Highlight Items
Mark any nav item with the star button in the admin panel to highlight it for users. Highlighted items receive:
- A colored background at reduced opacity
- A solid border in the highlight color
- A pulsing outer glow animation
- Bold primary-colored text

Highlighting is desktop only (the mobile nav renders differently and does not support this styling).

### Highlight Color
A color picker in the admin panel lets you choose the background and border color for highlighted items. Supports any hex color value. The background is rendered at partial opacity for a subtle effect, while the border and glow use the full color.

---

## Installation

Install via Flarum's built-in Extension Manager, or via Composer:

```bash
composer require resofire/menu-control
php flarum extension:enable resofire-menu-control
```

---

## First-time setup

After enabling the extension:

1. **Visit the forum index page** while logged in as an admin. This triggers automatic discovery of all active nav item keys and saves the current display order to the database.
2. Go to **Admin → Extensions → Menu Control**. All discovered nav items will be listed in their current forum order.
3. Adjust settings as desired and click **Save Order**.

If you later install or uninstall extensions that add nav items, visit the forum index page again as an admin to refresh the item list, then re-save your order.

---

## Admin Panel Reference

| Control | Description |
|---|---|
| Flip navigation | Toggle to show tags above nav items |
| Sticky sidebar | Toggle to fix sidebar position while scrolling (desktop only) |
| Highlight color | Color picker for highlighted item background, border, and glow |
| ↑ / ↓ buttons | Reorder nav items |
| Icon input | Override the Font Awesome icon for an item (e.g. `fas fa-fire`) |
| ★ star button | Toggle highlight on/off for an item |
| Save Order | Persist all changes |

---

## Settings stored

| Key | Content |
|---|---|
| `resofire-menu-control.order` | JSON array of nav keys in saved order |
| `resofire-menu-control.known-keys` | JSON array of all discovered nav keys |
| `resofire-menu-control.labels` | JSON object of key → display label (auto-discovered) |
| `resofire-menu-control.icons` | JSON object of key → FA icon class (auto-discovered) |
| `resofire-menu-control.custom-icons` | JSON object of key → admin-overridden FA icon class |
| `resofire-menu-control.flip` | `"1"` or `"0"` |
| `resofire-menu-control.sticky` | `"1"` or `"0"` |
| `resofire-menu-control.highlighted` | JSON array of highlighted nav keys |
| `resofire-menu-control.highlight-color` | Hex color string for highlight styling |

---

## Compatibility

Flarum **1.8+** (`flarum/core: ^1.8`).

---

## License

MIT — see [LICENSE](LICENSE).

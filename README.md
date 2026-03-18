# resofire/menu-control

A Flarum extension that gives admins full control over the sidebar navigation on the forum index page — reorder items, add custom links, customize icons, highlight items for users, and more.

---

## Features

### Navigation Order
Use the arrow buttons to reorder all sidebar nav items (All Discussions, Tags, Following, User Directory, third-party extension links, etc.). The order updates immediately after saving.

### Custom Links
Add your own links to the sidebar nav. Each custom link has a label, URL, and icon. External links (starting with `http://` or `https://`) open in a new tab automatically. Internal links (paths or your forum's URL) open in the same tab via Mithril's router.

### Flip Navigation
Moves tag links to the top of the sidebar and nav items (All Discussions, Following, etc.) to the bottom. Applies on all screen sizes.

### Sticky Sidebar
Keeps the sidebar fixed at the top of the viewport as the user scrolls. The Start a Discussion button stays visible at all times. Desktop only.

### Custom Icons
Each nav item has a text input for overriding its Font Awesome icon class (e.g. `fas fa-bolt`). Leave it empty to use the extension's default icon.

### Highlight Items
Mark any nav item with the star button to apply a highlight treatment: colored background at reduced opacity, solid border, and a pulsing glow animation. Desktop only.

### Highlight Color
A color picker controls the background, border, and glow color for highlighted items.

### Remove Items from List
Any item can be permanently removed from the admin list using the × button. Useful for items discovered by the PHP scanner that don't actually appear in your forum's nav (e.g. fof/polls items when global polls is disabled).

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

1. **Visit the forum index page** while logged in as an admin. This automatically detects all active nav items and saves the current display order.
2. Go to **Admin → Extensions → Menu Control** to configure.

If you install or uninstall extensions that add nav items, visit the forum index page again as admin to refresh the list.

---

## Admin Panel Reference

| Control | Description |
|---|---|
| Flip navigation | Toggle — tags above nav items |
| Sticky sidebar | Toggle — fixed sidebar on desktop |
| Highlight color | Color picker for highlighted item styling |
| Add Custom Link | Add a custom nav link with label, URL, and icon |
| Icon input | Override the Font Awesome icon (e.g. `fas fa-fire`) |
| ★ star button | Toggle highlight on/off for an item |
| × button | Remove item from the admin list permanently |
| ↑ / ↓ buttons | Reorder nav items |
| Save Order | Persist all changes |

---

## Compatibility with Other Extensions

### fof/blog
Ordering, custom icons, flip, and highlight all apply to the blog page's Forum Nav sidebar automatically.

### fof/polls
If fof/polls is installed, items like `fof-polls-showcase` may appear in the admin list even when global polls is disabled. Use the × button to remove them permanently.

---

## Settings stored

| Key | Content |
|---|---|
| `resofire-menu-control.order` | JSON array of nav keys in saved order |
| `resofire-menu-control.known-keys` | JSON array of all discovered nav keys |
| `resofire-menu-control.labels` | JSON object of key → display label (auto-discovered) |
| `resofire-menu-control.icons` | JSON object of key → FA icon class (auto-discovered) |
| `resofire-menu-control.custom-icons` | JSON object of key → admin-overridden FA icon class |
| `resofire-menu-control.custom-links` | JSON array of custom link objects |
| `resofire-menu-control.flip` | `"1"` or `"0"` |
| `resofire-menu-control.sticky` | `"1"` or `"0"` |
| `resofire-menu-control.highlighted` | JSON array of highlighted nav keys |
| `resofire-menu-control.highlight-color` | Hex color string |
| `resofire-menu-control.removed-keys` | JSON array of keys removed from the admin list |

---

## Requirements

Flarum **1.8+** (`flarum/core: ^1.8`).

---

## License

MIT — see [LICENSE](LICENSE).

# resofire/menu-control

A lightweight Flarum extension that lets admins reorder the sidebar navigation items on the forum index page via a drag-and-drop (or arrow button) interface in the admin panel.

---

## How it works

Every sidebar nav item (All Discussions, Tags, User Directory, etc.) is added via `IndexPage.navItems()`, an `ItemList` where each item has a numeric *priority* — higher priority = higher position.

This extension:

1. **Intercepts** `IndexPage.navItems()` after all other extensions have run, using Flarum's `override()`.
2. **Reassigns priorities** so items appear in the admin-defined order.
3. **Discovers keys automatically** — the first time an admin visits the forum index page after installation, all current nav keys are saved to `resofire-menu-control.known-keys`. Those keys then populate the admin UI.

No database migrations are needed. All state is stored in two rows in the `settings` table.

---

## Installation

```bash
composer require resofire/menu-control
php flarum extension:enable resofire-menu-control
```

Build JS assets:

```bash
cd packages/resofire/menu-control/js
yarn install
yarn build
```

---

## First-time setup

After enabling the extension:

1. **Visit the forum index page** while logged in as an admin. This triggers the key-discovery routine, which silently saves all active nav item keys to the database.
2. Go to **Admin → Extensions → Menu Control**. All discovered nav item keys will be listed.
3. Drag and drop (or use the ↑ / ↓ buttons) to set your preferred order.
4. Click **Save Order**.

If you later install or uninstall extensions that add nav items, revisit the forum index page to refresh the key list, then re-save your order in the admin panel.

---

## Settings stored

| Key | Content |
|---|---|
| `resofire-menu-control.order` | JSON array of nav keys in admin-defined order |
| `resofire-menu-control.known-keys` | JSON array of all ever-seen nav keys |

---

## File structure

```
resofire/menu-control/
├── composer.json
├── extend.php
├── resources/
│   ├── locale/
│   │   └── en.yml
│   └── less/
│       └── admin.less
└── js/
    ├── package.json
    ├── webpack.config.js
    └── src/
        ├── forum/
        │   └── index.js          ← Reorders navItems(); discovers keys
        └── admin/
            ├── index.js          ← Registers the extension settings page
            └── components/
                └── MenuControlPage.js  ← Drag-and-drop admin UI
```

---

## Compatibility

Flarum **2.x** (`flarum/core: ^2.0.0`).

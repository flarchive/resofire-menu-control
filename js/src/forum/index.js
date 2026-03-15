import app from 'flarum/forum/app';
import { override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

/**
 * Returns true for keys that are NOT reorderable menu items:
 *  - 'separator'       — the visual divider added by flarum/tags
 *  - 'moreTags'        — the "more tags" link added by flarum/tags
 *  - /^tag\d+$/        — individual tag entries (tag1, tag2, tag3 ...)
 *                        added by flarum/tags for each configured tag
 */
function isTagEntry(key) {
  return key === 'separator' || key === 'moreTags' || /^tag\d+$/.test(key);
}

app.initializers.add('resofire-menu-control', () => {
  override(IndexPage.prototype, 'navItems', function (original) {
    const items = original();

    // ── 1. Persist discovered MENU keys (excluding tag entries) ─────────────
    if (!app._menuControlKeysSynced) {
      app._menuControlKeysSynced = true;

      const discoveredKeys = Object.keys(items.toObject()).filter(k => !isTagEntry(k));

      const rawKnown = app.forum.attribute('menuControlKnownKeys');
      let knownKeys = [];
      try { knownKeys = rawKnown ? JSON.parse(rawKnown) : []; } catch (e) { knownKeys = []; }

      const merged = [...knownKeys];
      let changed = false;
      discoveredKeys.forEach((k) => {
        if (!merged.includes(k)) { merged.push(k); changed = true; }
      });

      if (changed && app.session.user && app.session.user.isAdmin()) {
        app.request({
          method: 'POST',
          url: app.forum.attribute('apiUrl') + '/settings',
          body: { 'resofire-menu-control.known-keys': JSON.stringify(merged) },
        }).catch(() => {});
      }
    }

    // ── 2. Apply the saved order ─────────────────────────────────────────────
    const rawOrder = app.forum.attribute('menuControlOrder');
    if (!rawOrder) return items;

    let order;
    try { order = JSON.parse(rawOrder); } catch (e) { return items; }
    if (!Array.isArray(order) || order.length === 0) return items;

    // Only act on menu-level keys — never touch tag entries.
    const menuOrder = order.filter(k => !isTagEntry(k));

    // Priorities for ordered menu items start well above the highest any
    // extension uses (core allDiscussions = 100, tags = -10, tag entries = -14).
    // Using 200+ guarantees the ordered block floats above everything.
    const base = menuOrder.length + 200;

    menuOrder.forEach((key, index) => {
      if (items.has(key)) {
        items.setPriority(key, base - index);
      }
    });

    // Menu items NOT in the saved order (newly added extensions) stay below
    // the ordered block but above tag entries by staying at their original
    // negative priority — we leave them untouched entirely.
    // Tag entries keep their original priorities (around -14) untouched.

    return items;
  });
});

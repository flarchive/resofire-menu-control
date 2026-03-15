import app from 'flarum/forum/app';
import { override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

app.initializers.add('resofire-menu-control', () => {
  override(IndexPage.prototype, 'navItems', function (original) {
    const items = original();

    // ── 1. Persist discovered keys so the admin page can list them ──────────
    // Runs once per page session, only posts to the API when logged in as admin
    // and new keys have appeared that aren't yet recorded.
    if (!app._menuControlKeysSynced) {
      app._menuControlKeysSynced = true;

      const discoveredKeys = Object.keys(items.toObject());
      const rawKnown = app.forum.attribute('menuControlKnownKeys');
      let knownKeys = [];
      try {
        knownKeys = rawKnown ? JSON.parse(rawKnown) : [];
      } catch (e) {
        knownKeys = [];
      }

      const merged = [...knownKeys];
      let changed = false;
      discoveredKeys.forEach((k) => {
        if (!merged.includes(k)) {
          merged.push(k);
          changed = true;
        }
      });

      if (changed && app.session.user && app.session.user.isAdmin()) {
        app
          .request({
            method: 'POST',
            url: app.forum.attribute('apiUrl') + '/settings',
            body: { 'resofire-menu-control.known-keys': JSON.stringify(merged) },
          })
          .catch(() => {});
      }
    }

    // ── 2. Apply the saved order ────────────────────────────────────────────
    const rawOrder = app.forum.attribute('menuControlOrder');
    if (!rawOrder) return items;

    let order;
    try {
      order = JSON.parse(rawOrder);
    } catch (e) {
      return items;
    }

    if (!Array.isArray(order) || order.length === 0) return items;

    // Assign priorities well above any typical extension value (core uses 100,
    // tags use -10 etc.) so our ordered block always stays coherent.
    const base = order.length + 100;

    order.forEach((key, index) => {
      if (items.has(key)) {
        // index 0 = first in list = highest priority = appears first
        items.setPriority(key, base - index);
      }
    });

    // Items not present in the saved order sink below the ordered block so
    // they don't accidentally float above items the admin has positioned.
    Object.keys(items.toObject()).forEach((key) => {
      if (!order.includes(key)) {
        const existing = items.getPriority(key);
        if (existing >= 0) {
          items.setPriority(key, -(Math.abs(existing) + 1));
        }
      }
    });

    return items;
  });
});

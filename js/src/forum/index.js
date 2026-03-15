import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

// Compiled once at module load, not on every call
const TAG_ENTRY_RE = /^tag\d+$/;

function isTagEntry(key) {
  return key === 'separator' || key === 'moreTags' || TAG_ENTRY_RE.test(key);
}

app.initializers.add('resofire-menu-control', () => {

  // ── oninit: runs once per IndexPage mount ──────────────────────────────────
  // Parse and cache the order here so navItems() never has to do it.
  // Also run the one-time key discovery here rather than inside navItems().
  extend(IndexPage.prototype, 'oninit', function () {
    // Parse and filter the saved order once, store on the instance.
    const rawOrder = app.forum.attribute('menuControlOrder');
    this._menuOrder = null;
    if (rawOrder) {
      try {
        const parsed = JSON.parse(rawOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this._menuOrder = parsed.filter(k => !isTagEntry(k));
        }
      } catch (e) {
        // malformed setting — leave as null, navItems will be a no-op
      }
    }

    // Key discovery: runs once per IndexPage mount, admin-only, background POST.
    // We intentionally do NOT use a session-level flag here — if a new extension
    // is enabled between page visits, the updated key list should be saved.
    if (app.session.user && app.session.user.isAdmin()) {
      // We schedule this after the current call stack so navItems() has
      // already run and populated items before we try to read them.
      // We read keys in the navItems extend below instead, storing on instance.
      this._menuControlShouldSync = true;
    }
  });

  // ── navItems: runs on every redraw — kept as cheap as possible ─────────────
  extend(IndexPage.prototype, 'navItems', function (items) {
    // One-time key discovery per mount: grab keys now that items is populated,
    // then fire the background save if anything is new.
    if (this._menuControlShouldSync) {
      this._menuControlShouldSync = false;

      const discoveredKeys = Object.keys(items.toObject()).filter(k => !isTagEntry(k));
      const rawKnown = app.forum.attribute('menuControlKnownKeys');
      let knownKeys = [];
      try { knownKeys = rawKnown ? JSON.parse(rawKnown) : []; } catch (e) { knownKeys = []; }

      const merged = knownKeys.slice();
      let changed = false;
      discoveredKeys.forEach(k => {
        if (merged.indexOf(k) === -1) { merged.push(k); changed = true; }
      });

      if (changed) {
        app.request({
          method: 'POST',
          url: app.forum.attribute('apiUrl') + '/settings',
          body: { 'resofire-menu-control.known-keys': JSON.stringify(merged) },
        }).catch(() => {});
      }
    }

    // Apply order: reads from instance cache set in oninit — no parsing here.
    const menuOrder = this._menuOrder;
    if (!menuOrder) return;

    const base = menuOrder.length + 200;
    menuOrder.forEach((key, index) => {
      if (items.has(key)) {
        items.setPriority(key, base - index);
      }
    });
  });

});

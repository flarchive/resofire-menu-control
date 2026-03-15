import app from 'flarum/forum/app';
import { override, extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import extractText from 'flarum/common/utils/extractText';

// Compiled once at module load
const TAG_ENTRY_RE = /^tag\d+$/;
function isTagEntry(key) {
  return key === 'separator' || key === 'moreTags' || TAG_ENTRY_RE.test(key);
}

app.initializers.add('resofire-menu-control', () => {

  // ── oninit: once per IndexPage mount ────────────────────────────────────
  // Parse and cache the saved order so navItems never has to JSON.parse per redraw.
  extend(IndexPage.prototype, 'oninit', function () {
    const rawOrder = app.forum.attribute('menuControlOrder');
    this._menuOrder = null;
    if (rawOrder) {
      try {
        const parsed = JSON.parse(rawOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this._menuOrder = parsed.filter(k => !isTagEntry(k));
        }
      } catch (e) {}
    }
    // Flag: admin-only key+label discovery runs once per mount via override below
    this._menuControlShouldSync = !!(app.session.user && app.session.user.isAdmin());
  });

  // ── navItems override: discovery (once per mount) + ordering (every redraw) ──
  // We use override here so that original() executes the COMPLETE navItems chain —
  // including all other extensions' extends — before we inspect the items.
  // If we used extend, our callback would fire before outer extensions add their items.
  override(IndexPage.prototype, 'navItems', function (original) {
    const items = original(); // Runs full chain: core + ALL extension extends

    // Discovery: once per mount (flag cleared immediately)
    if (this._menuControlShouldSync) {
      this._menuControlShouldSync = false;

      const discoveredKeys = Object.keys(items.toObject()).filter(k => !isTagEntry(k));

      // Build label map: extract visible text from each item's vnode
      const labels = {};
      discoveredKeys.forEach(k => {
        try {
          const text = extractText(items.get(k));
          if (text && text.trim()) labels[k] = text.trim();
        } catch (e) {}
      });

      const rawKnown = app.forum.attribute('menuControlKnownKeys');
      let knownKeys = [];
      try { knownKeys = rawKnown ? JSON.parse(rawKnown) : []; } catch (e) { knownKeys = []; }

      const merged = knownKeys.slice();
      let changed = false;
      discoveredKeys.forEach(k => {
        if (merged.indexOf(k) === -1) { merged.push(k); changed = true; }
      });

      // Always save labels (they may have changed even if keys haven't)
      app.request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/settings',
        body: {
          ...(changed ? { 'resofire-menu-control.known-keys': JSON.stringify(merged) } : {}),
          'resofire-menu-control.labels': JSON.stringify(labels),
        },
      }).catch(() => {});
    }

    // Apply saved order: reads instance cache — no JSON.parse per redraw
    const menuOrder = this._menuOrder;
    if (!menuOrder) return items;

    const base = menuOrder.length + 200;
    menuOrder.forEach((key, index) => {
      if (items.has(key)) {
        items.setPriority(key, base - index);
      }
    });

    return items;
  });

});

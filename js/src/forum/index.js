import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import extractText from 'flarum/common/utils/extractText';

// Compiled once at module load
const TAG_ENTRY_RE = /^tag\d+$/;
function isTagEntry(key) {
  return key === 'separator' || key === 'moreTags' || TAG_ENTRY_RE.test(key);
}

app.initializers.add('resofire-menu-control', () => {

  // ── oninit: once per IndexPage mount ─────────────────────────────────────
  // Parse and cache the saved order so navItems never JSON.parses per redraw.
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
    // Flag: discovery runs once on the first navItems call this mount, admin only.
    this._menuControlShouldSync = !!(app.session.user && app.session.user.isAdmin());
  });

  // ── navItems extend: discovery + ordering ─────────────────────────────────
  //
  // WHY extend (not override):
  // Extension JS files load in alphabetical order by extension ID.
  // 'resofire-menu-control' sorts after all 'flarum-*' and 'fof-*' IDs,
  // so our initializer runs LAST. Each extend() call wraps the current
  // prototype method — the last-registered extend fires LAST in the call chain.
  // That means our callback fires after every other extension has already
  // added its items, so items.toObject() contains the full set.
  //
  // With override(), our function replaces the prototype method entirely.
  // Extensions that run after us then wrap our override with extend().
  // When navItems() is called their wrappers fire first, calling original()
  // which eventually reaches our override — but at that point items only
  // contains what was added BEFORE our override in the inner chain,
  // missing everything added by extensions that registered after us.
  extend(IndexPage.prototype, 'navItems', function (items) {

    // ── 1. Discovery: once per mount, admin only ──────────────────────────
    // Runs on the very first navItems call after oninit (_menuControlShouldSync
    // is cleared immediately so subsequent redraws are a no-op check).
    if (this._menuControlShouldSync) {
      this._menuControlShouldSync = false;

      const menuKeys = Object.keys(items.toObject()).filter(k => !isTagEntry(k));

      // Build label map from each item's rendered vnode text
      const labels = {};
      menuKeys.forEach(k => {
        try {
          const text = extractText(items.get(k));
          if (text && text.trim()) labels[k] = text.trim();
        } catch (e) {}
      });

      // Always save both keys and labels together so the admin panel
      // always reflects the current state.
      app.request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/settings',
        body: {
          'resofire-menu-control.known-keys': JSON.stringify(menuKeys),
          'resofire-menu-control.labels': JSON.stringify(labels),
        },
      }).catch(() => {});
    }

    // ── 2. Apply saved order: reads instance cache, no JSON.parse per redraw ─
    const menuOrder = this._menuOrder;
    if (!menuOrder) return;

    const base = menuOrder.length + 200;
    menuOrder.forEach((key, index) => {
      if (items.has(key)) {
        items.setPriority(key, base - index);
      }
    });
    // extend() returns the original ItemList value — our setPriority mutations
    // are in-place on the same object, so no explicit return is needed.
  });

});

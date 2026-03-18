import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

const TAG_ENTRY_RE = /^tag\d+$/;
function isTagEntry(key) {
  return key === 'separator' || key === 'moreTags' || TAG_ENTRY_RE.test(key);
}

app.initializers.add('resofire-menu-control', () => {

  // Cache parsed order once per IndexPage mount (oninit fires once per mount).
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
  });

  // Apply saved order on every navItems call.
  // extend fires last (resofire > flarum/fof/huseyinfiliz alphabetically)
  // so all other extensions have already added their items.
  extend(IndexPage.prototype, 'navItems', function (items) {
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

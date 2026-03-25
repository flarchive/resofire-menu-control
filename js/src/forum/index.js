import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';

const TAG_ENTRY_RE = /^tag\d+$/;
function isTagEntry(key) {
  return key === 'separator' || key === 'moreTags' || TAG_ENTRY_RE.test(key);
}

app.initializers.add('resofire-menu-control', () => {

  // Cache the parsed order on the app object during IndexPage.oninit.
  // IndexPage and IndexSidebar are separate component instances so we
  // cannot share state via `this`. Using app.cache avoids a repeated
  // JSON.parse on every navItems() call while the page is mounted.
  extend(IndexPage.prototype, 'oninit', function () {
    const rawOrder = app.forum.attribute('menuControlOrder');
    app.cache.menuControlOrder = null;
    if (rawOrder) {
      try {
        const parsed = JSON.parse(rawOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          app.cache.menuControlOrder = parsed.filter(k => !isTagEntry(k));
        }
      } catch (e) {}
    }
  });

  // Apply saved order on every navItems call.
  // In Flarum 2.x nav items live on IndexSidebar, not IndexPage.
  extend(IndexSidebar.prototype, 'navItems', function (items) {
    const menuOrder = app.cache.menuControlOrder;
    if (!menuOrder) return;

    const base = menuOrder.length + 200;
    menuOrder.forEach((key, index) => {
      if (items.has(key)) {
        items.setPriority(key, base - index);
      }
    });
  });

});

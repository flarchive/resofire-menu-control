import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import LinkButton from 'flarum/common/components/LinkButton';
import extractText from 'flarum/common/utils/extractText';

const TAG_ENTRY_RE = /^tag\d+$/;
function isTagEntry(k) {
  return k === 'separator' || k === 'moreTags' || TAG_ENTRY_RE.test(k);
}

function getMenuSettings() {
  const rawOrder = app.forum.attribute('menuControlOrder');
  let menuOrder = null;
  if (rawOrder) {
    try {
      const parsed = JSON.parse(rawOrder);
      if (Array.isArray(parsed) && parsed.length > 0) {
        menuOrder = parsed.filter(k => !isTagEntry(k));
      }
    } catch (e) {}
  }

  const customLinksRaw = app.forum.attribute('menuControlCustomLinks');
  let customLinks = [];
  try { customLinks = Array.isArray(customLinksRaw) ? customLinksRaw : []; } catch (e) {}

  return {
    menuOrder,
    menuFlip:    !!app.forum.attribute('menuControlFlip'),
    customIcons: app.forum.attribute('menuControlCustomIcons') || {},
    highlighted: app.forum.attribute('menuControlHighlighted') || [],
    customLinks,
  };
}

function applyHighlightColor() {
  const hlColor = app.forum.attribute('menuControlHighlightColor');
  if (hlColor && hlColor.trim()) {
    const hex = hlColor.trim();
    document.documentElement.style.setProperty('--mc-highlight-color', hex);
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if (h.length === 6) {
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      document.documentElement.style.setProperty('--mc-highlight-bg', `rgba(${r},${g},${b},0.35)`);
    }
  }
}

let labelsSynced = false;

app.initializers.add('resofire-menu-control', () => {

  // Sticky sidebar — body class added/removed with IndexPage lifecycle
  extend(IndexPage.prototype, 'oninit', function () {
    if (app.forum.attribute('menuControlSticky')) {
      document.body.classList.add('resofire-sticky-nav');
    }
    // Cache parsed order for IndexSidebar.navItems extend below
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

  extend(IndexPage.prototype, 'onremove', function () {
    document.body.classList.remove('resofire-sticky-nav');
  });

  // In Flarum 2.x navItems lives on IndexSidebar
  extend(IndexSidebar.prototype, 'navItems', function (items) {
    const settings = getMenuSettings();
    const { menuOrder, menuFlip, customIcons, highlighted, customLinks } = settings;

    // Apply highlight color CSS vars
    applyHighlightColor();

    // Wrap toArray to inject behaviour at render time
    const origToArray = items.toArray.bind(items);
    items.toArray = function (keepPrimitives) {

      // Label/icon discovery — admin only, once per page load
      if (!labelsSynced && app.session.user && app.session.user.isAdmin()) {
        labelsSynced = true;
        const labels = {};
        const icons  = {};
        Object.keys(items.toObject()).forEach(k => {
          if (isTagEntry(k)) return;
          try {
            const vnode = items.get(k);
            const txt = extractText(vnode);
            if (txt && txt.trim()) labels[k] = txt.trim();
            if (vnode && vnode.attrs && vnode.attrs.icon) icons[k] = vnode.attrs.icon;
          } catch (e) {}
        });
        const renderedOrder = Object.keys(items.toObject()).filter(k => !isTagEntry(k));
        const body = {
          'resofire-menu-control.labels': JSON.stringify(labels),
          'resofire-menu-control.icons':  JSON.stringify(icons),
        };
        const existingOrder = app.forum.attribute('menuControlOrder');
        if (!existingOrder && renderedOrder.length > 0) {
          body['resofire-menu-control.order'] = JSON.stringify(renderedOrder);
        }
        app.request({
          method: 'POST',
          url: app.forum.attribute('apiUrl') + '/settings',
          body,
        }).catch(() => {});
      }

      // Inject custom links
      if (customLinks && customLinks.length > 0) {
        customLinks.forEach((link, idx) => {
          if (!link.url) return;
          const key = 'custom-link-' + idx;
          if (!items.has(key)) {
            let url = link.url;
            const baseUrl = app.forum.attribute('baseUrl') || '';
            const isInternal = url.indexOf(baseUrl) === 0;
            if (isInternal) url = url.slice(baseUrl.length) || '/';
            const isAbsolute = !isInternal && /^https?:\/\//i.test(url);
            const linkAttrs = { href: url, icon: link.icon || 'fas fa-link', external: isAbsolute };
            if (isAbsolute) { linkAttrs.target = '_blank'; linkAttrs.rel = 'noopener noreferrer'; }
            items.add(key, m(LinkButton, linkAttrs, link.label || 'Link'), 0);
          }
        });
      }

      // Apply custom icon overrides
      if (customIcons) {
        Object.keys(customIcons).forEach(key => {
          if (items.has(key)) {
            try {
              const vnode = items.get(key);
              if (vnode && vnode.attrs) vnode.attrs.icon = customIcons[key];
            } catch (e) {}
          }
        });
      }

      // Apply highlighted class
      if (highlighted && highlighted.length > 0) {
        highlighted.forEach(key => {
          if (items.has(key)) {
            try {
              const vnode = items.get(key);
              if (vnode && vnode.attrs) {
                vnode.attrs.itemClassName = (vnode.attrs.itemClassName || '') + ' MenuControl-highlighted';
              }
            } catch (e) {}
          }
        });
      }

      // Apply saved order
      if (menuOrder && menuOrder.length > 0) {
        const base = menuOrder.length + 200;
        menuOrder.forEach((key, index) => {
          if (items.has(key)) items.setPriority(key, base - index);
        });
      }

      // Apply flip (tags above nav items)
      if (menuFlip) {
        const allKeys = Object.keys(items.toObject());
        const navKeys = allKeys.filter(k => !isTagEntry(k) && items.getPriority(k) > 0);
        navKeys.sort((a, b) => items.getPriority(b) - items.getPriority(a));
        navKeys.forEach((k, i) => items.setPriority(k, -(201 + i)));
        allKeys.forEach(k => {
          if (k === 'separator') items.setPriority(k, 0);
          else if (isTagEntry(k)) items.setPriority(k, -items.getPriority(k));
        });
      }

      items.toArray = origToArray;
      return origToArray(keepPrimitives);
    };
  });

});

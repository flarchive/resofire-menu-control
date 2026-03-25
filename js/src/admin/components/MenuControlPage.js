import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import Switch from 'flarum/common/components/Switch';
import ColorPreviewInput from 'flarum/common/components/ColorPreviewInput';
import Stream from 'flarum/common/utils/Stream';
import saveSettings from 'flarum/admin/utils/saveSettings';

const TAG_ENTRY_RE = /^tag\d+$/;
function isTagEntry(k) {
  return k === 'separator' || k === 'moreTags' || TAG_ENTRY_RE.test(k);
}

export default class MenuControlPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);
    this.loading = false;
    this.successAlert = null;

    this._labels = app.forum.attribute('menuControlNavLabels') || {};
    this._icons  = app.forum.attribute('menuControlIcons')    || {};

    this.orderedKeys = this._buildInitialOrder();
    this._savedOrder = this.orderedKeys.slice();

    // Flip toggle
    const rawFlip = app.data.settings['resofire-menu-control.flip'];
    this.flipNav = Stream(rawFlip === '1' || rawFlip === true);
    this._savedFlip = this.flipNav();

    // Sticky toggle
    const rawSticky = app.data.settings['resofire-menu-control.sticky'];
    this.stickyNav = Stream(rawSticky === '1' || rawSticky === true);
    this._savedSticky = this.stickyNav();

    // Highlight color
    const rawHlColor = app.data.settings['resofire-menu-control.highlight-color'] || '';
    this.highlightColor = Stream(rawHlColor);
    this._savedHighlightColor = rawHlColor;

    // Custom icons — admin-overridden FA class strings per key
    let customIconsObj = {};
    try { customIconsObj = JSON.parse(app.data.settings['resofire-menu-control.custom-icons'] || '{}'); } catch (e) {}
    this.customIcons = Stream(customIconsObj);
    this._savedCustomIcons = JSON.stringify(customIconsObj);

    // Highlighted items
    let highlightedArr = [];
    try { highlightedArr = JSON.parse(app.data.settings['resofire-menu-control.highlighted'] || '[]'); } catch (e) {}
    this.highlighted = Stream(highlightedArr);
    this._savedHighlighted = JSON.stringify(highlightedArr);

    // Removed keys — items hidden by admin
    let removedArr = [];
    try { removedArr = JSON.parse(app.data.settings['resofire-menu-control.removed-keys'] || '[]'); } catch (e) {}
    this.removedKeys = Stream(removedArr);
    this._savedRemovedKeys = JSON.stringify(removedArr);

    // Custom links
    let customLinksArr = [];
    try { customLinksArr = JSON.parse(app.data.settings['resofire-menu-control.custom-links'] || '[]'); } catch (e) {}
    this.customLinks = Stream(customLinksArr);
    this._savedCustomLinks = JSON.stringify(customLinksArr);
  }

  _buildInitialOrder() {
    const phpKeys = (app.forum.attribute('menuControlNavKeys') || [])
      .filter(k => !isTagEntry(k));

    const rawOrder = app.data.settings['resofire-menu-control.order'] || null;
    let savedOrder = [];
    try { savedOrder = rawOrder ? JSON.parse(rawOrder) : []; } catch (e) {}
    savedOrder = savedOrder.filter(k => !isTagEntry(k));

    let removed = [];
    try { removed = JSON.parse(app.data.settings['resofire-menu-control.removed-keys'] || '[]'); } catch (e) {}

    // Add custom link keys so their saved positions are preserved
    let customLinkKeys = [];
    try {
      const cl = JSON.parse(app.data.settings['resofire-menu-control.custom-links'] || '[]');
      cl.forEach((_, i) => customLinkKeys.push('custom-link-' + i));
    } catch (e) {}
    customLinkKeys.forEach(k => { if (!phpKeys.includes(k)) phpKeys.push(k); });

    const merged = savedOrder.filter(k => phpKeys.includes(k) && !removed.includes(k));
    phpKeys.forEach(k => { if (!merged.includes(k) && !removed.includes(k)) merged.push(k); });

    // Default: move tags to end if no saved order yet
    if (!rawOrder) {
      const ti = merged.indexOf('tags');
      if (ti !== -1 && ti !== merged.length - 1) {
        merged.splice(ti, 1);
        merged.push('tags');
      }
    }

    return merged;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _label(key) {
    if (this._isCustomLink(key)) return this._customLinkLabel(key);
    return this._labels[key] || key;
  }

  _icon(key) { return this._icons[key] || null; }

  _effectiveIcon(key) {
    const ci = this.customIcons();
    if (this._isCustomLink(key)) {
      const idx = this._customLinkIndex(key);
      const link = this.customLinks()[idx];
      if (ci[key] && ci[key].trim()) return ci[key].trim();
      return link && link.icon ? link.icon : 'fas fa-link';
    }
    return (ci[key] && ci[key].trim()) ? ci[key].trim() : this._icon(key);
  }

  _isHighlighted(key) { return this.highlighted().includes(key); }

  _toggleHighlighted(key) {
    const arr = this.highlighted().slice();
    const idx = arr.indexOf(key);
    if (idx === -1) arr.push(key); else arr.splice(idx, 1);
    this.highlighted(arr);
    m.redraw();
  }

  _removeItem(key) {
    this.orderedKeys = this.orderedKeys.filter(k => k !== key);
    const removed = this.removedKeys().slice();
    if (!removed.includes(key)) removed.push(key);
    this.removedKeys(removed);
    m.redraw();
  }

  _addCustomLink() {
    const links = this.customLinks().slice();
    links.push({ label: '', icon: 'fas fa-link', url: '' });
    this.customLinks(links);
    this.orderedKeys = [...this.orderedKeys, 'custom-link-' + (links.length - 1)];
    m.redraw();
  }

  _updateCustomLink(index, field, value) {
    const links = this.customLinks().slice();
    if (!links[index]) return;
    links[index] = Object.assign({}, links[index], { [field]: value });
    this.customLinks(links);
  }

  _removeCustomLink(index) {
    const links = this.customLinks().slice();
    links.splice(index, 1);
    this.customLinks(links);
    const key = 'custom-link-' + index;
    let arr = this.orderedKeys.filter(k => k !== key);
    // Re-index remaining custom-link-N keys
    for (let i = index; i < links.length; i++) {
      arr = arr.map(k => k === 'custom-link-' + (i + 1) ? 'custom-link-' + i : k);
    }
    this.orderedKeys = arr;
    m.redraw();
  }

  _isCustomLink(key) { return key.startsWith('custom-link-'); }
  _customLinkIndex(key) { return parseInt(key.replace('custom-link-', ''), 10); }
  _customLinkLabel(key) {
    const link = this.customLinks()[this._customLinkIndex(key)];
    return link && link.label ? link.label : 'Custom Link';
  }

  _moveUp(index) {
    if (index === 0) return;
    const arr = this.orderedKeys.slice();
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    this.orderedKeys = arr; m.redraw();
  }

  _moveDown(index) {
    if (index === this.orderedKeys.length - 1) return;
    const arr = this.orderedKeys.slice();
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    this.orderedKeys = arr; m.redraw();
  }

  // ── Dirty check ───────────────────────────────────────────────────────────

  changed() {
    if (this.flipNav()         !== this._savedFlip)          return true;
    if (this.stickyNav()       !== this._savedSticky)         return true;
    if (this.highlightColor()  !== this._savedHighlightColor) return true;
    if (JSON.stringify(this.customIcons())   !== this._savedCustomIcons)   return true;
    if (JSON.stringify(this.highlighted())   !== this._savedHighlighted)   return true;
    if (JSON.stringify(this.removedKeys())   !== this._savedRemovedKeys)   return true;
    if (JSON.stringify(this.customLinks())   !== this._savedCustomLinks)   return true;
    const a = this.orderedKeys, b = this._savedOrder;
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
    return false;
  }

  prepareSubmissionData() {
    return {
      'resofire-menu-control.order':          JSON.stringify(this.orderedKeys),
      'resofire-menu-control.flip':           this.flipNav()    ? '1' : '0',
      'resofire-menu-control.sticky':         this.stickyNav()  ? '1' : '0',
      'resofire-menu-control.highlight-color': this.highlightColor(),
      'resofire-menu-control.custom-icons':   JSON.stringify(this.customIcons()),
      'resofire-menu-control.highlighted':    JSON.stringify(this.highlighted()),
      'resofire-menu-control.removed-keys':   JSON.stringify(this.removedKeys()),
      'resofire-menu-control.custom-links':   JSON.stringify(this.customLinks()),
    };
  }

  onsubmit(e) {
    e.preventDefault();
    if (this.loading) return;
    this.loading = true;
    app.alerts.dismiss(this.successAlert);
    saveSettings(this.prepareSubmissionData())
      .then(() => {
        this.successAlert = app.alerts.show(
          { type: 'success' },
          app.translator.trans('core.admin.settings.saved_message')
        );
        this._savedOrder          = this.orderedKeys.slice();
        this._savedFlip           = this.flipNav();
        this._savedSticky         = this.stickyNav();
        this._savedHighlightColor = this.highlightColor();
        this._savedCustomIcons    = JSON.stringify(this.customIcons());
        this._savedHighlighted    = JSON.stringify(this.highlighted());
        this._savedRemovedKeys    = JSON.stringify(this.removedKeys());
        this._savedCustomLinks    = JSON.stringify(this.customLinks());
      })
      .catch(() => {})
      .then(() => { this.loading = false; m.redraw(); });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  content(vnode) {
    const keys = this.orderedKeys;

    return (
      <div className="MenuControlPage">
        <div className="container">
          <p className="helpText">
            {app.translator.trans('resofire-menu-control.admin.nav_order.description')}
          </p>

          <form onsubmit={this.onsubmit.bind(this)}>

            {/* Flip Navigation */}
            <div className="Form-group">
              <Switch state={this.flipNav()} onchange={val => { this.flipNav(val); m.redraw(); }}>
                {app.translator.trans('resofire-menu-control.admin.nav_order.flip_label')}
              </Switch>
            </div>
            <p className="helpText" style="margin-top:-8px;margin-bottom:16px;">
              {app.translator.trans('resofire-menu-control.admin.nav_order.flip_help')}
            </p>

            {/* Sticky Sidebar */}
            <div className="Form-group">
              <Switch state={this.stickyNav()} onchange={val => { this.stickyNav(val); m.redraw(); }}>
                {app.translator.trans('resofire-menu-control.admin.nav_order.sticky_label')}
              </Switch>
            </div>
            <p className="helpText" style="margin-top:-8px;margin-bottom:16px;">
              {app.translator.trans('resofire-menu-control.admin.nav_order.sticky_help')}
            </p>

            {/* Highlight Color */}
            <div className="Form-group">
              <label className="control-label">
                {app.translator.trans('resofire-menu-control.admin.nav_order.highlight_color_label')}
              </label>
              <p className="helpText">
                {app.translator.trans('resofire-menu-control.admin.nav_order.highlight_color_help')}
              </p>
              <div style="max-width:200px">
                <ColorPreviewInput
                  value={this.highlightColor() || ''}
                  placeholder="#536F90"
                  oninput={e => { this.highlightColor(e.target.value); m.redraw(); }}
                />
              </div>
            </div>

            {/* Add Custom Link */}
            <div className="Form-group">
              <Button
                className="Button"
                type="button"
                icon="fas fa-plus"
                onclick={e => { e.preventDefault(); e.stopPropagation(); this._addCustomLink(); }}
              >
                {app.translator.trans('resofire-menu-control.admin.nav_order.add_custom_link')}
              </Button>
            </div>

            <p className="helpText MenuControlPage-pollsNote">
              {app.translator.trans('resofire-menu-control.admin.nav_order.polls_note')}
            </p>

            {/* Nav item list */}
            {keys.length === 0
              ? <p className="MenuControlPage-empty helpText">
                  {app.translator.trans('resofire-menu-control.admin.nav_order.no_items')}
                </p>
              : <ul className="MenuControlPage-list">
                  {keys.map((key, index) => this._renderItem(key, index, keys))}
                </ul>
            }

            <Button
              type="submit"
              className="Button Button--primary"
              loading={this.loading}
              disabled={!this.changed()}
            >
              {app.translator.trans('resofire-menu-control.admin.nav_order.save_button')}
            </Button>

          </form>
        </div>
      </div>
    );
  }

  // ── Item renderer ─────────────────────────────────────────────────────────

  _renderItem(key, index, keys) {
    if (this._isCustomLink(key)) {
      const idx  = this._customLinkIndex(key);
      const link = this.customLinks()[idx] || { label: '', icon: 'fas fa-link', url: '' };

      return (
        <li key={key} className="MenuControlPage-item MenuControlPage-item--customLink">
          <span className="MenuControlPage-icon" aria-hidden="true">
            <i className={this._effectiveIcon(key) + ' fa-fw'} />
          </span>
          <span className="MenuControlPage-customLink-fields">
            <input
              className="FormControl MenuControlPage-customLink-label"
              type="text"
              placeholder={app.translator.trans('resofire-menu-control.admin.nav_order.custom_link_label')}
              value={link.label || ''}
              oninput={e => this._updateCustomLink(idx, 'label', e.target.value)}
            />
            <input
              className="FormControl MenuControlPage-customLink-url"
              type="text"
              placeholder="https://"
              value={link.url || ''}
              oninput={e => this._updateCustomLink(idx, 'url', e.target.value)}
            />
          </span>
          <input
            className="FormControl MenuControlPage-iconInput"
            type="text"
            placeholder="fas fa-link"
            value={this.customIcons()[key] || link.icon || ''}
            oninput={e => {
              const ci = Object.assign({}, this.customIcons());
              const v = e.target.value;
              if (v) { ci[key] = v; } else { delete ci[key]; }
              this.customIcons(ci);
            }}
          />
          <Button
            className={'Button Button--icon Button--flat MenuControlPage-highlight' + (this._isHighlighted(key) ? ' is-highlighted' : '')}
            icon={this._isHighlighted(key) ? 'fas fa-star' : 'far fa-star'}
            title={app.translator.trans(this._isHighlighted(key) ? 'resofire-menu-control.admin.nav_order.remove_highlight' : 'resofire-menu-control.admin.nav_order.add_highlight')}
            onclick={() => this._toggleHighlighted(key)}
          />
          <Button
            className="Button Button--icon Button--flat MenuControlPage-remove"
            icon="fas fa-times"
            title={app.translator.trans('resofire-menu-control.admin.nav_order.remove_item')}
            onclick={() => this._removeCustomLink(idx)}
          />
          <span className="MenuControlPage-arrows">
            <Button className="Button Button--icon Button--flat" icon="fas fa-arrow-up"
              title={app.translator.trans('resofire-menu-control.admin.nav_order.move_up')}
              disabled={index === 0} onclick={() => this._moveUp(index)} />
            <Button className="Button Button--icon Button--flat" icon="fas fa-arrow-down"
              title={app.translator.trans('resofire-menu-control.admin.nav_order.move_down')}
              disabled={index === keys.length - 1} onclick={() => this._moveDown(index)} />
          </span>
        </li>
      );
    }

    return (
      <li key={key} className="MenuControlPage-item">
        <span className="MenuControlPage-icon" aria-hidden="true">
          {this._effectiveIcon(key)
            ? <i className={this._effectiveIcon(key) + ' fa-fw'} />
            : <i className="fas fa-question fa-fw" style="opacity:0.2" />
          }
        </span>
        <span className="MenuControlPage-label">{this._label(key)}</span>
        <input
          className="FormControl MenuControlPage-iconInput"
          type="text"
          placeholder={this._icon(key) || 'fas fa-...'}
          value={this.customIcons()[key] || ''}
          title={app.translator.trans('resofire-menu-control.admin.nav_order.icon_input_title')}
          oninput={e => {
            const ci = Object.assign({}, this.customIcons());
            const v = e.target.value;
            if (v) { ci[key] = v; } else { delete ci[key]; }
            this.customIcons(ci);
          }}
        />
        <Button
          className={'Button Button--icon Button--flat MenuControlPage-highlight' + (this._isHighlighted(key) ? ' is-highlighted' : '')}
          icon={this._isHighlighted(key) ? 'fas fa-star' : 'far fa-star'}
          title={app.translator.trans(this._isHighlighted(key) ? 'resofire-menu-control.admin.nav_order.remove_highlight' : 'resofire-menu-control.admin.nav_order.add_highlight')}
          onclick={() => this._toggleHighlighted(key)}
        />
        <Button
          className="Button Button--icon Button--flat MenuControlPage-remove"
          icon="fas fa-times"
          title={app.translator.trans('resofire-menu-control.admin.nav_order.remove_item')}
          onclick={() => this._removeItem(key)}
        />
        <span className="MenuControlPage-arrows">
          <Button className="Button Button--icon Button--flat" icon="fas fa-arrow-up"
            title={app.translator.trans('resofire-menu-control.admin.nav_order.move_up')}
            disabled={index === 0} onclick={() => this._moveUp(index)} />
          <Button className="Button Button--icon Button--flat" icon="fas fa-arrow-down"
            title={app.translator.trans('resofire-menu-control.admin.nav_order.move_down')}
            disabled={index === keys.length - 1} onclick={() => this._moveDown(index)} />
        </span>
      </li>
    );
  }
}

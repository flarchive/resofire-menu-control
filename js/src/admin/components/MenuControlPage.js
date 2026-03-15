import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import saveSettings from 'flarum/admin/utils/saveSettings';

export default class MenuControlPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);

    this.saving = false;
    this.saveSuccess = false;

    // Keys of the item being dragged and the current drag-over target
    this.draggingKey = null;
    this.dragOverKey = null;

    // Build the initial ordered list by merging the saved order with all
    // known keys. The saved order comes first; any keys not yet in it are
    // appended at the end so nothing is silently hidden.
    this.orderedKeys = this._buildInitialOrder();
  }

  /**
   * Merge the saved order array with the full set of known keys, so the admin
   * always sees every key that has ever been detected, in the right order.
   */
  _buildInitialOrder() {
    const rawOrder = app.data.settings['resofire-menu-control.order'] || null;
    const rawKnown = app.data.settings['resofire-menu-control.known-keys'] || null;

    let savedOrder = [];
    let knownKeys = [];

    try { savedOrder = rawOrder ? JSON.parse(rawOrder) : []; } catch (e) { savedOrder = []; }
    try { knownKeys = rawKnown ? JSON.parse(rawKnown) : []; } catch (e) { knownKeys = []; }

    const merged = [...savedOrder];
    knownKeys.forEach((k) => {
      if (!merged.includes(k)) merged.push(k);
    });

    return merged;
  }

  /**
   * ExtensionPage calls content() inside its own wrapper which renders the
   * extension header (title, enable/disable toggle, etc.). We only need to
   * return the body of our settings panel here.
   */
  content() {
    const keys = this.orderedKeys;

    return (
      <div className="MenuControlPage">
        <div className="container">
          <p className="helpText">
            {app.translator.trans('resofire-menu-control.admin.nav_order.description')}
          </p>

          {keys.length === 0 ? (
            <p className="MenuControlPage-empty helpText">
              {app.translator.trans('resofire-menu-control.admin.nav_order.no_items')}
            </p>
          ) : (
            <ul className="MenuControlPage-list">
              {keys.map((key, index) => this._renderItem(key, index, keys))}
            </ul>
          )}

          <div className="MenuControlPage-actions">
            <Button
              className="Button Button--primary"
              onclick={this._save.bind(this)}
              loading={this.saving}
              disabled={this.saving || keys.length === 0}
            >
              {app.translator.trans('resofire-menu-control.admin.nav_order.save_button')}
            </Button>

            {this.saveSuccess && (
              <span className="MenuControlPage-success">
                ✓ {app.translator.trans('resofire-menu-control.admin.nav_order.save_success')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  _renderItem(key, index, keys) {
    const isDragging = this.draggingKey === key;
    const isDragOver = this.dragOverKey === key;

    return (
      <li
        key={key}
        className={'MenuControlPage-item' + (isDragging ? ' is-dragging' : '') + (isDragOver ? ' is-dragover' : '')}
        draggable="true"
        ondragstart={(e) => {
          this.draggingKey = key;
          e.dataTransfer.effectAllowed = 'move';
          // Required for Firefox
          e.dataTransfer.setData('text/plain', key);
        }}
        ondragover={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (this.dragOverKey !== key) {
            this.dragOverKey = key;
            m.redraw();
          }
        }}
        ondragleave={(e) => {
          // Only clear if we're leaving this element entirely, not entering a child
          if (!e.currentTarget.contains(e.relatedTarget)) {
            this.dragOverKey = null;
            m.redraw();
          }
        }}
        ondrop={(e) => {
          e.preventDefault();
          const fromKey = this.draggingKey;
          const toKey = key;
          if (fromKey && fromKey !== toKey) {
            this._moveItem(fromKey, toKey);
          }
          this.draggingKey = null;
          this.dragOverKey = null;
        }}
        ondragend={() => {
          this.draggingKey = null;
          this.dragOverKey = null;
          m.redraw();
        }}
      >
        <span className="MenuControlPage-handle" aria-hidden="true">⠿</span>

        <span className="MenuControlPage-key">{key}</span>

        <span className="MenuControlPage-arrows">
          <Button
            className="Button Button--icon Button--flat"
            icon="fas fa-arrow-up"
            aria-label={app.translator.trans('resofire-menu-control.admin.nav_order.move_up')}
            disabled={index === 0}
            onclick={() => this._moveUp(index)}
          />
          <Button
            className="Button Button--icon Button--flat"
            icon="fas fa-arrow-down"
            aria-label={app.translator.trans('resofire-menu-control.admin.nav_order.move_down')}
            disabled={index === keys.length - 1}
            onclick={() => this._moveDown(index)}
          />
        </span>
      </li>
    );
  }

  // ── List mutation helpers ─────────────────────────────────────────────────

  _moveItem(fromKey, toKey) {
    const arr = [...this.orderedKeys];
    const fromIndex = arr.indexOf(fromKey);
    const toIndex = arr.indexOf(toKey);
    if (fromIndex === -1 || toIndex === -1) return;
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, fromKey);
    this.orderedKeys = arr;
    m.redraw();
  }

  _moveUp(index) {
    if (index === 0) return;
    const arr = [...this.orderedKeys];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    this.orderedKeys = arr;
    m.redraw();
  }

  _moveDown(index) {
    if (index === this.orderedKeys.length - 1) return;
    const arr = [...this.orderedKeys];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    this.orderedKeys = arr;
    m.redraw();
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  _save() {
    this.saving = true;
    this.saveSuccess = false;
    m.redraw();

    const serialized = JSON.stringify(this.orderedKeys);

    // saveSettings() POSTs to /api/settings and keeps app.data.settings in sync
    saveSettings({
      'resofire-menu-control.order': serialized,
      'resofire-menu-control.known-keys': serialized,
    })
      .then(() => {
        this.saving = false;
        this.saveSuccess = true;
        m.redraw();

        setTimeout(() => {
          this.saveSuccess = false;
          m.redraw();
        }, 3000);
      })
      .catch(() => {
        this.saving = false;
        m.redraw();
      });
  }
}

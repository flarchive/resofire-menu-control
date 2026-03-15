import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import saveSettings from 'flarum/admin/utils/saveSettings';

/**
 * Returns true for keys that are tag entries injected by flarum/tags,
 * not reorderable menu items: 'separator', 'moreTags', 'tag1', 'tag2' …
 */
function isTagEntry(key) {
  return key === 'separator' || key === 'moreTags' || /^tag\d+$/.test(key);
}

export default class MenuControlPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);

    this.saving = false;
    this.saveSuccess = false;
    this.draggingKey = null;
    this.dragOverKey = null;
    this.orderedKeys = this._buildInitialOrder();
  }

  _buildInitialOrder() {
    const rawOrder = app.data.settings['resofire-menu-control.order'] || null;
    const rawKnown = app.data.settings['resofire-menu-control.known-keys'] || null;

    let savedOrder = [];
    let knownKeys = [];
    try { savedOrder = rawOrder ? JSON.parse(rawOrder) : []; } catch (e) { savedOrder = []; }
    try { knownKeys = rawKnown ? JSON.parse(rawKnown) : []; } catch (e) { knownKeys = []; }

    // Merge saved order + any newly discovered keys, filtering tag entries from both
    const merged = savedOrder.filter(k => !isTagEntry(k));
    knownKeys.forEach((k) => {
      if (!isTagEntry(k) && !merged.includes(k)) merged.push(k);
    });

    return merged;
  }

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
          e.dataTransfer.setData('text/plain', key);
        }}
        ondragover={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (this.dragOverKey !== key) { this.dragOverKey = key; m.redraw(); }
        }}
        ondragleave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) { this.dragOverKey = null; m.redraw(); }
        }}
        ondrop={(e) => {
          e.preventDefault();
          const fromKey = this.draggingKey;
          if (fromKey && fromKey !== key) this._moveItem(fromKey, key);
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

  _moveItem(fromKey, toKey) {
    const arr = [...this.orderedKeys];
    const fi = arr.indexOf(fromKey), ti = arr.indexOf(toKey);
    if (fi === -1 || ti === -1) return;
    arr.splice(fi, 1); arr.splice(ti, 0, fromKey);
    this.orderedKeys = arr; m.redraw();
  }

  _moveUp(index) {
    if (index === 0) return;
    const arr = [...this.orderedKeys];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    this.orderedKeys = arr; m.redraw();
  }

  _moveDown(index) {
    if (index === this.orderedKeys.length - 1) return;
    const arr = [...this.orderedKeys];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    this.orderedKeys = arr; m.redraw();
  }

  _save() {
    this.saving = true;
    this.saveSuccess = false;
    m.redraw();

    const serialized = JSON.stringify(this.orderedKeys);

    saveSettings({
      'resofire-menu-control.order': serialized,
      'resofire-menu-control.known-keys': serialized,
    }).then(() => {
      this.saving = false;
      this.saveSuccess = true;
      m.redraw();
      setTimeout(() => { this.saveSuccess = false; m.redraw(); }, 3000);
    }).catch(() => {
      this.saving = false;
      m.redraw();
    });
  }
}

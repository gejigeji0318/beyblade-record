// プリセット管理ロジック
const Preset = {
  editingId: null,

  init() {
    this.editingId = null;
    App.createBeyForm('presetBeyForm', 'preset');
    document.getElementById('presetName').value = '';
    this.renderList();
  },

  // 保存（新規 or 上書き）
  save() {
    const nameEl = document.getElementById('presetName');
    const name = nameEl.value.trim();
    if (!name) {
      App.showToast('プリセット名を入力してください', 'error');
      return;
    }

    const err = App.validateBeyConfig('preset');
    if (err) { App.showToast(err, 'error'); return; }

    const config = App.getPresetConfig('preset');
    const presets = App.getPresets();

    if (this.editingId) {
      // 上書き編集
      const idx = presets.findIndex(p => p.id === this.editingId);
      if (idx >= 0) {
        presets[idx].name = name;
        presets[idx].config = config;
      }
      this.editingId = null;
      App.showToast(`プリセット「${name}」を更新しました`);
    } else {
      // 新規追加
      presets.push({ id: Date.now(), name, config });
      App.showToast(`プリセット「${name}」を登録しました`);
    }

    localStorage.setItem('beyPresets', JSON.stringify(presets));
    nameEl.value = '';
    // フォームリセット
    App.createBeyForm('presetBeyForm', 'preset');
    this.renderList();
    App.refreshAllPresetSelects();
  },

  // 一覧描画
  renderList() {
    const presets = App.getPresets();
    const listEl = document.getElementById('presetList');
    const emptyEl = document.getElementById('presetEmpty');

    if (presets.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    listEl.innerHTML = presets.map(p => {
      const desc = App.beyConfigToShortName(p.config);
      return `<div class="preset-item">
        <div class="preset-item-info">
          <div class="preset-item-name">${p.name}</div>
          <div class="preset-item-desc">${desc}</div>
        </div>
        <div class="preset-item-actions">
          <button class="preset-btn preset-btn-save" onclick="Preset.edit(${p.id})">編集</button>
          <button class="preset-btn preset-btn-delete" onclick="Preset.delete(${p.id})">削除</button>
        </div>
      </div>`;
    }).join('');
  },

  // 編集: フォームに読み込み
  edit(id) {
    const presets = App.getPresets();
    const preset = presets.find(p => p.id === id);
    if (!preset) return;

    this.editingId = id;
    document.getElementById('presetName').value = preset.name;
    App.setBeyConfig('preset', preset.config);
    App.showToast(`「${preset.name}」を編集中`);
    // フォームにスクロール
    document.getElementById('presetName').scrollIntoView({ behavior: 'smooth' });
  },

  // 削除
  delete(id) {
    const presets = App.getPresets();
    const target = presets.find(p => p.id === id);
    if (!target) return;
    if (!confirm(`プリセット「${target.name}」を削除しますか？`)) return;

    const filtered = presets.filter(p => p.id !== id);
    localStorage.setItem('beyPresets', JSON.stringify(filtered));

    if (this.editingId === id) {
      this.editingId = null;
      document.getElementById('presetName').value = '';
      App.createBeyForm('presetBeyForm', 'preset');
    }

    this.renderList();
    App.refreshAllPresetSelects();
    App.showToast('プリセットを削除しました');
  }
};

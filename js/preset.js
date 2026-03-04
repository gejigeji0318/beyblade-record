// プリセット管理ロジック
const Preset = {
  editingId: null,
  currentPage: 1,
  pageSize: window.innerWidth <= 768 ? 10 : 30,

  init() {
    this.editingId = null;
    this.currentPage = 1;
    App.createBeyForm('presetBeyForm', 'preset', { noTabs: true });
    document.getElementById('presetName').value = '';
    this.renderList();
  },

  // 保存（新規 or 上書き）
  save() {
    const err = App.validateBeyConfig('preset');
    if (err) { App.showToast(err, 'error'); return; }

    const config = App.getPresetConfig('preset');
    const nameEl = document.getElementById('presetName');
    let name = nameEl.value.trim();

    // 自動生成名を算出
    const autoName = this.generateAutoName(config);

    // 名前が空なら自動生成名を使用
    if (!name) {
      name = autoName;
    } else if (name !== autoName) {
      // パーツ名っぽい名前なのに実パーツと不一致 → 拒否
      const allBladeNames = [
        ...BLADE_DATA.BX, ...BLADE_DATA.UX, ...BLADE_DATA['その他'],
        ...BLADE_DATA.CX.lockChip
      ];
      const startsWithBlade = allBladeNames.some(b => name.startsWith(b));
      const hasRatchetPattern = /\d-\d+/.test(name) || /Tr$/.test(name) || /Op$/.test(name);
      if (startsWithBlade && hasRatchetPattern) {
        App.showToast('パーツ名を使う場合は実際の構成と一致させてください', 'error');
        return;
      }
    }

    // 同名チェック（編集中の自分自身は除外）
    const existing = App.getPresets().find(p => p.name === name && p.id !== this.editingId);
    if (existing) {
      App.showToast(`「${name}」は既に登録されています`, 'error');
      return;
    }

    if (this.editingId) {
      // 上書き編集
      database.ref('presets/' + this.editingId).update({ name, config })
        .then(() => {
          App.showToast(`プリセット「${name}」を更新しました`);
          this.editingId = null;
          nameEl.value = '';
          App.createBeyForm('presetBeyForm', 'preset', { noTabs: true });
        })
        .catch(err => App.showToast('更新に失敗しました: ' + err.message, 'error'));
    } else {
      // 新規追加
      database.ref('presets').push({ name, config })
        .then(() => {
          App.showToast(`プリセット「${name}」を登録しました`);
          nameEl.value = '';
          App.createBeyForm('presetBeyForm', 'preset', { noTabs: true });
        })
        .catch(err => App.showToast('登録に失敗しました: ' + err.message, 'error'));
    }
  },

  // 一覧描画
  renderList() {
    const presets = App.getPresets();
    const listEl = document.getElementById('presetList');
    const emptyEl = document.getElementById('presetEmpty');
    if (!listEl || !emptyEl) return;

    if (presets.length === 0) {
      listEl.innerHTML = '';
      this.clearPagers();
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    // お気に入り順: お気に入り→その他
    const favs = presets.filter(p => App.isFavorite(p.id));
    const others = presets.filter(p => !App.isFavorite(p.id));
    const sorted = [...favs, ...others];

    // ページ計算
    const totalCount = sorted.length;
    const totalPages = Math.ceil(totalCount / this.pageSize);
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    const pageItems = sorted.slice(start, start + this.pageSize);

    listEl.innerHTML = pageItems.map(p => {
      const desc = App.beyConfigToShortName(p.config);
      const isFav = App.isFavorite(p.id);
      const starClass = isFav ? 'preset-btn-fav active' : 'preset-btn-fav';
      return `<div class="preset-item${isFav ? ' preset-item-fav' : ''}">
        <button class="${starClass}" onclick="App.toggleFavorite('${p.id}')" title="お気に入り">${isFav ? '★' : '☆'}</button>
        <div class="preset-item-info">
          <div class="preset-item-name">${p.name}</div>
          <div class="preset-item-desc">${desc}</div>
        </div>
        <div class="preset-item-actions">
          <button class="preset-btn preset-btn-save" onclick="Preset.edit('${p.id}')">編集</button>
          <button class="preset-btn preset-btn-delete" onclick="Preset.delete('${p.id}')">削除</button>
        </div>
      </div>`;
    }).join('');

    this.renderPager(totalCount, totalPages);
  },

  // ページャーをクリア
  clearPagers() {
    const top = document.getElementById('presetPagerTop');
    const bottom = document.getElementById('presetPagerBottom');
    if (top) top.innerHTML = '';
    if (bottom) bottom.innerHTML = '';
  },

  // ページャー描画（上下両方）
  renderPager(totalCount, totalPages) {
    const topEl = document.getElementById('presetPagerTop');
    const bottomEl = document.getElementById('presetPagerBottom');

    if (totalCount === 0) { this.clearPagers(); return; }

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, totalCount);

    // 件数切替ボタン
    const sizes = [10, 30, 50];
    const sizesHtml = '<div class="preset-pager-sizes">' +
      sizes.map(s =>
        `<button class="preset-pager-size${this.pageSize === s ? ' active' : ''}" onclick="Preset.changePageSize(${s})">${s}件</button>`
      ).join('') + '</div>';

    // 情報
    const infoHtml = `<div class="preset-pager-info">全${totalCount}件中 ${start}-${end}件</div>`;

    // ページ送りHTML（2ページ以上ある場合のみ）
    let navHtml = '';
    if (totalPages > 1) {
      let pages = [];
      pages.push(`<button class="preset-pager-btn" onclick="Preset.goToPage(${this.currentPage - 1})"${this.currentPage <= 1 ? ' disabled' : ''}>←</button>`);
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
          pages.push(`<button class="preset-pager-btn${i === this.currentPage ? ' active' : ''}" onclick="Preset.goToPage(${i})">${i}</button>`);
        } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
          pages.push('<span class="preset-pager-dots">...</span>');
        }
      }
      pages.push(`<button class="preset-pager-btn" onclick="Preset.goToPage(${this.currentPage + 1})"${this.currentPage >= totalPages ? ' disabled' : ''}>→</button>`);
      navHtml = '<div class="preset-pager-nav">' + pages.join('') + '</div>';
    }

    // 上: 件数切替 + 情報 + ページ送り
    if (topEl) topEl.innerHTML = `<div class="preset-pager-row">${sizesHtml}${infoHtml}</div>${navHtml}`;
    // 下: ページ送りのみ
    if (bottomEl) bottomEl.innerHTML = navHtml;
  },

  // 表示件数変更
  changePageSize(size) {
    this.pageSize = size;
    this.currentPage = 1;
    this.renderList();
  },

  // ページ移動
  goToPage(page) {
    this.currentPage = page;
    this.renderList();
    const listEl = document.getElementById('presetList');
    if (listEl) listEl.scrollIntoView({ behavior: 'smooth' });
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

    database.ref('presets/' + id).remove()
      .then(() => {
        if (this.editingId === id) {
          this.editingId = null;
          document.getElementById('presetName').value = '';
          App.createBeyForm('presetBeyForm', 'preset', { noTabs: true });
        }
        App.showToast('プリセットを削除しました');
      })
      .catch(err => App.showToast('削除に失敗しました: ' + err.message, 'error'));
  },

  // パーツからの自動名生成
  generateAutoName(config) {
    let blade = '';
    if (config.bladeType === 'CX') {
      const ab = (config.assistBlade || '').replace(/（.*?）/g, '');
      blade = [config.lockChip, config.mainBlade, ab].filter(Boolean).join('');
    } else {
      blade = config.blade || '';
    }
    const ratchet = config.ratchet || '';
    const bit = (config.bit || '').replace(/（.*?）/g, '');
    return `${blade}${ratchet}${bit}`;
  }
};

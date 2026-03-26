// メインアプリケーション
const App = {
  currentUser: null,
  currentScreen: 'passphrase',
  presetsCache: [],
  presetsListener: null,
  favoritesCache: {},
  favoritesListener: null,

  init() {
    // セッション中に認証済みならスキップ
    if (sessionStorage.getItem('authenticated') === 'true') {
      document.getElementById('screenPassphrase').classList.add('hidden');
      document.getElementById('screenUserSelect').classList.remove('hidden');
      this.currentScreen = 'userSelect';
    }
    this.renderUserGrid();
    this.renderPlayerFilter();
    this.startPresetsListener();
  },

  // SHA-256ハッシュ計算
  async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 合言葉チェック
  async checkPassphrase() {
    const input = document.getElementById('passphraseInput').value;
    const hash = await this.hashString(input);

    if (hash === PASSPHRASE_HASH) {
      sessionStorage.setItem('authenticated', 'true');
      document.getElementById('screenPassphrase').classList.add('hidden');
      document.getElementById('screenUserSelect').classList.remove('hidden');
      document.getElementById('passphraseError').classList.add('hidden');
      this.currentScreen = 'userSelect';
    } else {
      document.getElementById('passphraseError').classList.remove('hidden');
    }
  },

  // ユーザー選択グリッドの描画
  renderUserGrid() {
    const grid = document.getElementById('userGrid');
    grid.innerHTML = USERS.map(user =>
      `<div class="user-btn" onclick="App.selectUser('${user}')">${user}</div>`
    ).join('');
  },

  // ユーザー選択
  selectUser(name) {
    this.currentUser = name;
    document.getElementById('headerUser').textContent = name;
    document.getElementById('changeUserBtn').classList.remove('hidden');

    // アクティブ状態更新
    document.querySelectorAll('#userGrid .user-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent === name);
    });

    this.startFavoritesListener();
    this.showScreen('menu');
  },

  // 画面切り替え
  showScreen(screen) {
    if (screen !== 'userSelect' && screen !== 'passphrase' && !this.currentUser) {
      this.showScreen('userSelect');
      return;
    }

    // 全画面を非表示
    document.querySelectorAll('[id^="screen"]').forEach(el => el.classList.add('hidden'));

    // 対象画面を表示
    const screenMap = {
      userSelect: 'screenUserSelect',
      menu: 'screenMenu',
      register: 'screenRegister',
      view: 'screenView',
      preset: 'screenPreset'
    };

    const targetId = screenMap[screen];
    if (targetId) {
      document.getElementById(targetId).classList.remove('hidden');
    }

    this.currentScreen = screen;

    // 画面固有の初期化
    if (screen === 'register') {
      Register.init();
    } else if (screen === 'view') {
      View.init();
    } else if (screen === 'preset') {
      Preset.init();
    }
  },

  // プレイヤーフィルター描画
  renderPlayerFilter() {
    const select = document.getElementById('filterPlayer');
    if (!select) return;
    const options = '<option value="all">全プレイヤー</option>' +
      USERS.map(u => `<option value="${u}">${u}</option>`).join('');
    select.innerHTML = options;
  },

  // ひらがな→カタカナ変換（文字列）
  toKatakana(str) {
    return str.replace(/[\u3041-\u3096]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
  },

  // Blade検索ドロップダウンの表示・フィルタ
  filterBladeList(prefix) {
    const input = document.getElementById(`${prefix}_blade`);
    const dropdown = document.getElementById(`${prefix}_bladeDropdown`);
    const bladeType = document.getElementById(`${prefix}_bladeType`).value;

    if (!bladeType || bladeType === 'CX' || !BLADE_DATA[bladeType]) {
      dropdown.classList.add('hidden');
      return;
    }

    const query = this.toKatakana(input.value.trim());
    const blades = BLADE_DATA[bladeType];
    const filtered = query ? blades.filter(b => b.includes(query)) : blades;

    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="blade-dropdown-empty">該当なし</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = filtered.map(b =>
      `<div class="blade-dropdown-item" onmousedown="App.selectBlade('${prefix}','${b}')">${b}</div>`
    ).join('');
    dropdown.classList.remove('hidden');
  },

  // Blade候補を選択
  selectBlade(prefix, value) {
    document.getElementById(`${prefix}_blade`).value = value;
    document.getElementById(`${prefix}_bladeDropdown`).classList.add('hidden');
    // ブレード固有のラチェット制限を反映
    this.refreshRatchetKeys(prefix);
  },

  // Bladeドロップダウンを閉じる
  closeBladeList(prefix) {
    document.getElementById(`${prefix}_bladeDropdown`).classList.add('hidden');
  },

  // プリセット検索ドロップダウンの表示・フィルタ
  filterPresetList(prefix) {
    const input = document.getElementById(`${prefix}_presetSearch`);
    const dropdown = document.getElementById(`${prefix}_presetDropdown`);
    if (!input || !dropdown) return;

    const query = this.toKatakana(input.value.trim());
    const presets = this.getPresets();
    const filtered = query ? presets.filter(p => this.toKatakana(p.name).includes(query)) : presets;

    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="blade-dropdown-empty">該当なし</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = filtered.map(p =>
      `<div class="blade-dropdown-item" onmousedown="App.selectPresetFromList('${prefix}','${p.id}')">${p.name}</div>`
    ).join('');
    dropdown.classList.remove('hidden');
  },

  // プリセット候補を選択
  selectPresetFromList(prefix, presetId) {
    const presets = this.getPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    const input = document.getElementById(`${prefix}_presetSearch`);
    if (input) input.value = preset.name;
    this.closePresetList(prefix);

    this.setBeyConfig(prefix, preset.config);
    this.showSelectedSummary(prefix, preset.name);
  },

  // プリセットドロップダウンを閉じる
  closePresetList(prefix) {
    const dropdown = document.getElementById(`${prefix}_presetDropdown`);
    if (dropdown) dropdown.classList.add('hidden');
  },

  // トースト通知
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  // ベイ構成フォームを生成（noTabs: true でタブなし＝手動入力のみ）
  createBeyForm(containerId, prefix, options) {
    const noTabs = options && options.noTabs;
    const container = document.getElementById(containerId);
    const presets = this.getPresets();
    const hasFavs = Object.keys(this.favoritesCache).length > 0;
    const defaultTab = noTabs ? 'manual' : (hasFavs ? 'fav' : 'manual');

    container.innerHTML = `
      <!-- タブ切替 -->
      <div class="bey-tabs${noTabs ? ' hidden' : ''}" id="${prefix}_tabs">
        <button type="button" class="bey-tab${defaultTab === 'fav' ? ' active' : ''}" data-tab="fav" onclick="App.switchBeyTab('${prefix}','fav')">★お気に入り</button>
        <button type="button" class="bey-tab${defaultTab === 'preset' ? ' active' : ''}" data-tab="preset" onclick="App.switchBeyTab('${prefix}','preset')">プリセット</button>
        <button type="button" class="bey-tab${defaultTab === 'manual' ? ' active' : ''}" data-tab="manual" onclick="App.switchBeyTab('${prefix}','manual')">手動入力</button>
      </div>

      ${noTabs ? `
      <!-- noTabs時: プリセットから読み込み -->
      <div class="preset-search-wrap" style="margin-bottom:12px;">
        <input type="text" id="${prefix}_presetSearch" class="preset-search" placeholder="プリセットから読み込み（ひらがな可）..." autocomplete="off"
          oninput="App.filterPresetList('${prefix}')"
          onfocus="App.filterPresetList('${prefix}')"
          onblur="setTimeout(()=>App.closePresetList('${prefix}'),200)">
        <div class="preset-dropdown hidden" id="${prefix}_presetDropdown"></div>
      </div>
      ` : `
      <!-- お気に入りタブ -->
      <div id="${prefix}_tabFav" class="bey-tab-content${defaultTab !== 'fav' ? ' hidden' : ''}">
        <div id="${prefix}_favList" class="fav-list"></div>
      </div>

      <!-- プリセットタブ -->
      <div id="${prefix}_tabPreset" class="bey-tab-content${defaultTab !== 'preset' ? ' hidden' : ''}">
        <div class="preset-search-wrap">
          <input type="text" id="${prefix}_presetSearch" class="preset-search" placeholder="プリセット検索（ひらがな可）..." autocomplete="off"
            oninput="App.filterPresetList('${prefix}')"
            onfocus="App.filterPresetList('${prefix}')"
            onblur="setTimeout(()=>App.closePresetList('${prefix}'),200)">
          <div class="preset-dropdown hidden" id="${prefix}_presetDropdown"></div>
        </div>
      </div>

      <!-- 選択済み表示 -->
      <div id="${prefix}_selectedSummary" class="bey-selected-summary hidden">
        ✓ <span id="${prefix}_selectedName"></span>
      </div>
      `}

      <!-- 手動入力タブ（フォーム本体） -->
      <div id="${prefix}_tabManual" class="bey-tab-content${defaultTab !== 'manual' ? ' hidden' : ''}">

        <!-- Blade選択 -->
        <div class="form-group">
          <label>Bladeタイプ</label>
          <select id="${prefix}_bladeType" onchange="App.onBladeTypeChange('${prefix}')">
            <option value="">選択してください</option>
            <option value="BX">BX</option>
            <option value="UX">UX</option>
            <option value="CX">CX</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <!-- BX/UX/その他 用のBlade選択 -->
        <div class="form-group hidden" id="${prefix}_bladeSimple">
          <label>Blade</label>
          <div class="blade-search-wrap">
            <input type="text" id="${prefix}_blade" placeholder="入力して検索（ひらがな可）..." autocomplete="off"
              oninput="App.filterBladeList('${prefix}')"
              onfocus="App.filterBladeList('${prefix}')"
              onblur="setTimeout(()=>App.closeBladeList('${prefix}'),200)">
            <div class="blade-dropdown hidden" id="${prefix}_bladeDropdown"></div>
          </div>
        </div>

        <!-- CX用パーツ選択 -->
        <div id="${prefix}_bladeCX" class="hidden">
          <div class="form-group cx-type-row">
            <label>
              <input type="radio" name="${prefix}_cxType" value="main" checked onchange="App.onCxTypeChange('${prefix}')"> メインブレード型
            </label>
            <label>
              <input type="radio" name="${prefix}_cxType" value="over" onchange="App.onCxTypeChange('${prefix}')"> オーバーブレード型
            </label>
          </div>
          <div class="form-group">
            <label>Lock Chip</label>
            <select id="${prefix}_lockChip">
              <option value="">選択してください</option>
              ${BLADE_DATA.CX.lockChip.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
          </div>
          <div id="${prefix}_cxMain">
            <div class="form-group">
              <label>Main Blade</label>
              <select id="${prefix}_mainBlade">
                <option value="">選択してください</option>
                ${BLADE_DATA.CX.mainBlade.map(v => `<option value="${v}">${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="${prefix}_cxOver" class="hidden">
            <div class="form-group">
              <label>Metal Blade</label>
              <select id="${prefix}_metalBlade">
                <option value="">選択してください</option>
                ${BLADE_DATA.CX.metalBlade.map(v => `<option value="${v}">${v}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Over Blade</label>
              <select id="${prefix}_overBlade">
                <option value="">選択してください</option>
                ${BLADE_DATA.CX.overBlade.map(v => `<option value="${v}">${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Assist Blade</label>
            <select id="${prefix}_assistBlade">
              <option value="">選択してください</option>
              ${BLADE_DATA.CX.assistBlade.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Ratchet選択 -->
        <div class="form-group">
          <label>Ratchet刃数</label>
          <select id="${prefix}_ratchetKey" onchange="App.onRatchetKeyChange('${prefix}')">
            <option value="">選択してください</option>
            ${Object.keys(RATCHET_DATA.simpleRatchet).map(k => `<option value="${k}">${k}</option>`).join('')}
            ${RATCHET_DATA.bitTogether.map(v => `<option value="${v}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group hidden" id="${prefix}_ratchetValueWrap">
          <label>Ratchet高さ</label>
          <select id="${prefix}_ratchetValue">
            <option value="">先に番号を選択</option>
          </select>
        </div>

        <!-- Bit選択 -->
        <div class="form-group" id="${prefix}_bitSection">
          <label>Bit</label>
          <select id="${prefix}_bit">
            <option value="">選択してください</option>
            ${Object.entries(BIT_DATA).map(([type, bits]) =>
              `<optgroup label="${type}">
                ${bits.map(b => `<option value="${b}">${b}</option>`).join('')}
              </optgroup>`
            ).join('')}
          </select>
        </div>

      </div>
    `;
    // お気に入りボタンを描画
    this.renderFavButtons(prefix);
  },

  // Bladeタイプ変更
  onBladeTypeChange(prefix) {
    const type = document.getElementById(`${prefix}_bladeType`).value;
    const simpleEl = document.getElementById(`${prefix}_bladeSimple`);
    const cxEl = document.getElementById(`${prefix}_bladeCX`);
    const bladeInput = document.getElementById(`${prefix}_blade`);

    simpleEl.classList.add('hidden');
    cxEl.classList.add('hidden');

    if (type === 'CX') {
      cxEl.classList.remove('hidden');
      // CXの入力欄をリセット
      document.getElementById(`${prefix}_lockChip`).value = '';
      document.getElementById(`${prefix}_mainBlade`).value = '';
      document.getElementById(`${prefix}_overBlade`).value = '';
      document.getElementById(`${prefix}_metalBlade`).value = '';
      document.getElementById(`${prefix}_assistBlade`).value = '';
      // cxTypeをmainに初期化
      const mainRadio = document.querySelector(`input[name="${prefix}_cxType"][value="main"]`);
      if (mainRadio) mainRadio.checked = true;
      this.onCxTypeChange(prefix);
    } else if (type && BLADE_DATA[type]) {
      simpleEl.classList.remove('hidden');
      bladeInput.value = '';
    }
  },

  // CXサブタイプ切替
  onCxTypeChange(prefix) {
    const cxType = document.querySelector(`input[name="${prefix}_cxType"]:checked`);
    const isOver = cxType && cxType.value === 'over';
    const mainEl = document.getElementById(`${prefix}_cxMain`);
    const overEl = document.getElementById(`${prefix}_cxOver`);
    if (mainEl) mainEl.classList.toggle('hidden', isOver);
    if (overEl) overEl.classList.toggle('hidden', !isOver);
  },

  // 選択中のブレード名を取得
  getSelectedBlade(prefix) {
    const bladeType = document.getElementById(`${prefix}_bladeType`).value;
    if (bladeType === 'CX') return '';
    return (document.getElementById(`${prefix}_blade`) || {}).value || '';
  },

  // ブレード固有のラチェット制限（値が5で終わるもののみ）
  RATCHET_RESTRICTED_BLADES: ['クロックミラージュ'],

  isRatchetRestricted(prefix) {
    return this.RATCHET_RESTRICTED_BLADES.includes(this.getSelectedBlade(prefix));
  },

  // ブレード制限に応じてRatchet刃数ドロップダウンを更新
  refreshRatchetKeys(prefix) {
    const keySelect = document.getElementById(`${prefix}_ratchetKey`);
    if (!keySelect) return;
    const current = keySelect.value;
    const restricted = this.isRatchetRestricted(prefix);

    let html = '<option value="">選択してください</option>';
    // simpleRatchet: 制限時は5で終わる値を持つキーのみ
    Object.entries(RATCHET_DATA.simpleRatchet).forEach(([k, values]) => {
      if (restricted && !values.some(v => v % 10 === 5)) return;
      html += `<option value="${k}">${k}</option>`;
    });
    // bitTogether: 制限時は非表示
    if (!restricted) {
      RATCHET_DATA.bitTogether.forEach(v => {
        html += `<option value="${v}">${v}</option>`;
      });
    }
    keySelect.innerHTML = html;
    keySelect.value = current;
    // 選択中のキーが消えた場合はリセット
    if (keySelect.value !== current) {
      keySelect.value = '';
    }
    this.onRatchetKeyChange(prefix);
  },

  // Ratchetキー変更
  onRatchetKeyChange(prefix) {
    const key = document.getElementById(`${prefix}_ratchetKey`).value;
    const valueWrap = document.getElementById(`${prefix}_ratchetValueWrap`);
    const valueSelect = document.getElementById(`${prefix}_ratchetValue`);
    const bitSection = document.getElementById(`${prefix}_bitSection`);
    const isBitTogether = RATCHET_DATA.bitTogether.includes(key);
    const restricted = this.isRatchetRestricted(prefix);

    if (isBitTogether) {
      valueWrap.classList.add('hidden');
      bitSection.classList.add('hidden');
    } else if (key && RATCHET_DATA.simpleRatchet[key]) {
      valueWrap.classList.remove('hidden');
      bitSection.classList.remove('hidden');
      let values = RATCHET_DATA.simpleRatchet[key];
      if (restricted) values = values.filter(v => v % 10 === 5);
      valueSelect.innerHTML = '<option value="">選択してください</option>' +
        values.map(v => `<option value="${v}">${v}</option>`).join('');
    } else {
      valueWrap.classList.add('hidden');
      bitSection.classList.remove('hidden');
    }
  },

  // ベイ構成データを取得
  getBeyConfig(prefix) {
    const bladeType = document.getElementById(`${prefix}_bladeType`).value;
    const ratchetKey = document.getElementById(`${prefix}_ratchetKey`).value;
    const isBitTogether = RATCHET_DATA.bitTogether.includes(ratchetKey);

    const config = {
      bladeType: bladeType,
      blade: null,
      lockChip: null,
      mainBlade: null,
      overBlade: null,
      metalBlade: null,
      assistBlade: null,
      cxType: null,
      ratchetType: isBitTogether ? 'bitTogether' : 'simpleRatchet',
      ratchet: null,
      bit: null
    };

    // Blade
    if (bladeType === 'CX') {
      const cxTypeRadio = document.querySelector(`input[name="${prefix}_cxType"]:checked`);
      config.cxType = cxTypeRadio ? cxTypeRadio.value : 'main';
      config.lockChip = document.getElementById(`${prefix}_lockChip`).value;
      config.assistBlade = document.getElementById(`${prefix}_assistBlade`).value;
      if (config.cxType === 'over') {
        config.overBlade = document.getElementById(`${prefix}_overBlade`).value;
        config.metalBlade = document.getElementById(`${prefix}_metalBlade`).value;
        config.blade = `${config.lockChip} ${config.metalBlade} ${config.overBlade} ${config.assistBlade}`;
      } else {
        config.mainBlade = document.getElementById(`${prefix}_mainBlade`).value;
        config.blade = `${config.lockChip} ${config.mainBlade} ${config.assistBlade}`;
      }
    } else if (bladeType) {
      config.blade = document.getElementById(`${prefix}_blade`).value;
    }

    // Ratchet
    if (isBitTogether) {
      config.ratchet = ratchetKey;
    } else if (ratchetKey) {
      const value = document.getElementById(`${prefix}_ratchetValue`).value;
      config.ratchet = value ? `${ratchetKey}-${value}` : null;
    }

    // Bit
    if (!isBitTogether) {
      config.bit = document.getElementById(`${prefix}_bit`).value;
    }

    return config;
  },

  // ベイ構成の表示用テキスト
  beyConfigToString(config) {
    if (!config) return '未設定';
    const parts = [];
    if (config.bladeType === 'CX') {
      const ab = (config.assistBlade || '').replace(/（.*?）/g, '');
      if (config.cxType === 'over') {
        const ob = (config.overBlade || '').replace(/（.*?）/g, '');
        parts.push(`${config.lockChip} ${config.metalBlade} ${ob} ${ab}`);
      } else {
        parts.push(`${config.lockChip} ${config.mainBlade} ${ab}`);
      }
    } else {
      parts.push(config.blade || '?');
    }
    parts.push(config.ratchet || '?');
    if (config.bit) {
      parts.push(config.bit);
    }
    return parts.join(' / ');
  },

  // ベイ構成のバリデーション
  validateBeyConfig(prefix) {
    const config = this.getBeyConfig(prefix);

    if (!config.bladeType) return 'Bladeタイプを選択してください';

    if (config.bladeType === 'CX') {
      if (!config.lockChip) return 'Lock Chipを選択してください';
      if (config.cxType === 'over') {
        if (!config.overBlade) return 'Over Bladeを選択してください';
        if (!config.metalBlade) return 'Metal Bladeを選択してください';
      } else {
        if (!config.mainBlade) return 'Main Bladeを選択してください';
      }
      if (!config.assistBlade) return 'Assist Bladeを選択してください';
    } else {
      if (!config.blade) return 'Bladeを選択してください';
      const bladeList = BLADE_DATA[config.bladeType];
      if (bladeList && !bladeList.includes(config.blade)) {
        return `「${config.blade}」はBladeリストに存在しません`;
      }
    }

    const ratchetKey = document.getElementById(`${prefix}_ratchetKey`).value;
    if (!ratchetKey) return 'Ratchetを選択してください';

    if (!config.ratchet) return 'Ratchetを選択してください';

    if (config.ratchetType === 'simpleRatchet' && !config.bit) {
      return 'Bitを選択してください';
    }

    return null;
  },

  // ベイパーツ重複チェック（3on3・チーム戦用）
  // Lock Chip以外は重複不可、Lock Chipはワルキューレ・エンペラーのみ重複不可
  validateBeyDuplicates(beys) {
    const NO_DUPLICATE_LOCK_CHIPS = ['ワルキューレ', 'エンペラー'];
    const collected = {
      blade: [], mainBlade: [], overBlade: [], metalBlade: [], assistBlade: [], lockChip: [], ratchet: [], bit: []
    };

    for (const bey of beys) {
      if (!bey) continue;
      if (bey.bladeType === 'CX') {
        if (bey.mainBlade) collected.mainBlade.push(bey.mainBlade);
        if (bey.overBlade) collected.overBlade.push(bey.overBlade);
        if (bey.metalBlade) collected.metalBlade.push(bey.metalBlade);
        if (bey.assistBlade) collected.assistBlade.push(bey.assistBlade);
        if (bey.lockChip && NO_DUPLICATE_LOCK_CHIPS.includes(bey.lockChip)) {
          collected.lockChip.push(bey.lockChip);
        }
      } else {
        if (bey.blade) collected.blade.push(bey.blade);
      }
      if (bey.ratchet) collected.ratchet.push(bey.ratchet);
      if (bey.bit) collected.bit.push(bey.bit);
    }

    const labels = {
      blade: 'Blade', mainBlade: 'Main Blade', overBlade: 'Over Blade',
      metalBlade: 'Metal Blade', assistBlade: 'Assist Blade',
      lockChip: 'Lock Chip', ratchet: 'Ratchet', bit: 'Bit'
    };

    for (const [key, values] of Object.entries(collected)) {
      const dup = values.find((v, i) => values.indexOf(v) !== i);
      if (dup) return `${labels[key]}「${dup}」が重複しています`;
    }

    return null;
  },

  // --- プリセット機能 ---

  // プリセットのフォーム値をセット
  setBeyConfig(prefix, config) {
    // bladeType → onBladeTypeChange で表示切替
    document.getElementById(`${prefix}_bladeType`).value = config.bladeType || '';
    this.onBladeTypeChange(prefix);

    if (config.bladeType === 'CX') {
      // cxType ラジオをセット（未定義なら'main'）
      const cxType = config.cxType || 'main';
      const radio = document.querySelector(`input[name="${prefix}_cxType"][value="${cxType}"]`);
      if (radio) radio.checked = true;
      this.onCxTypeChange(prefix);

      document.getElementById(`${prefix}_lockChip`).value = config.lockChip || '';
      if (cxType === 'over') {
        document.getElementById(`${prefix}_overBlade`).value = config.overBlade || '';
        document.getElementById(`${prefix}_metalBlade`).value = config.metalBlade || '';
      } else {
        document.getElementById(`${prefix}_mainBlade`).value = config.mainBlade || '';
      }
      document.getElementById(`${prefix}_assistBlade`).value = config.assistBlade || '';
    } else if (config.blade) {
      document.getElementById(`${prefix}_blade`).value = config.blade;
    }

    // ratchetKey → onRatchetKeyChange で高さオプション生成
    document.getElementById(`${prefix}_ratchetKey`).value = config.ratchetKey || '';
    this.onRatchetKeyChange(prefix);
    if (config.ratchetValue) {
      document.getElementById(`${prefix}_ratchetValue`).value = config.ratchetValue;
    }

    // Bit
    const bitEl = document.getElementById(`${prefix}_bit`);
    if (bitEl && config.bit) {
      bitEl.value = config.bit;
    }
  },

  // プリセット保存用のconfig取得（ratchetKey/Value分離保存）
  getPresetConfig(prefix) {
    const config = this.getBeyConfig(prefix);
    config.ratchetKey = document.getElementById(`${prefix}_ratchetKey`).value;
    config.ratchetValue = document.getElementById(`${prefix}_ratchetValue`).value || '';
    return config;
  },

  // Firebaseからプリセットをリアルタイム取得
  startPresetsListener() {
    if (this.presetsListener) {
      database.ref('presets').off('value', this.presetsListener);
    }
    this.presetsListener = database.ref('presets').on('value', snapshot => {
      this.presetsCache = [];
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([id, preset]) => {
          preset.id = id;
          this.presetsCache.push(preset);
        });
      }
      this.refreshAllPresetSelects();
      // プリセット管理画面が表示中なら一覧を更新
      if (this.currentScreen === 'preset') {
        Preset.renderList();
      }
    });
  },

  // プリセット一覧取得（キャッシュから）
  getPresets() {
    return this.presetsCache;
  },

  // プリセット読み込み（検索ドロップダウンから選択時に使用）
  // → selectPresetFromList() に移行済み

  // タブ切替
  switchBeyTab(prefix, tab) {
    // タブボタンの active 切替
    const tabsEl = document.getElementById(`${prefix}_tabs`);
    if (!tabsEl) return;
    tabsEl.querySelectorAll('.bey-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // タブコンテンツの表示切替
    const favEl = document.getElementById(`${prefix}_tabFav`);
    const presetEl = document.getElementById(`${prefix}_tabPreset`);
    const manualEl = document.getElementById(`${prefix}_tabManual`);
    const summaryEl = document.getElementById(`${prefix}_selectedSummary`);

    if (favEl) favEl.classList.toggle('hidden', tab !== 'fav');
    if (presetEl) presetEl.classList.toggle('hidden', tab !== 'preset');
    if (manualEl) manualEl.classList.toggle('hidden', tab !== 'manual');

    // 手動入力タブではサマリーを非表示
    if (tab === 'manual' && summaryEl) {
      summaryEl.classList.add('hidden');
    }
  },

  // お気に入りボタンクリック
  selectFavorite(prefix, presetId) {
    const presets = this.getPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    this.setBeyConfig(prefix, preset.config);
    this.showSelectedSummary(prefix, preset.name);

    // ボタンの active 切替
    const favList = document.getElementById(`${prefix}_favList`);
    if (favList) {
      favList.querySelectorAll('.fav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id === presetId);
      });
    }
  },

  // 選択済みサマリー表示
  showSelectedSummary(prefix, name) {
    const summaryEl = document.getElementById(`${prefix}_selectedSummary`);
    const nameEl = document.getElementById(`${prefix}_selectedName`);
    if (summaryEl && nameEl) {
      nameEl.textContent = name;
      summaryEl.classList.remove('hidden');
    }
  },

  // 個別フォームのお気に入りボタン描画
  renderFavButtons(prefix) {
    const favList = document.getElementById(`${prefix}_favList`);
    if (!favList) return;

    const presets = this.getPresets();
    const favIds = this.favoritesCache;
    const favs = presets.filter(p => favIds[p.id]);

    if (favs.length === 0) {
      favList.innerHTML = '<div class="fav-empty">お気に入り未登録です。プリセット管理画面で★をタップして登録できます。</div>';
      return;
    }

    favList.innerHTML = favs.map(p =>
      `<button type="button" class="fav-btn" data-id="${p.id}" onclick="App.selectFavorite('${prefix}','${p.id}')">${p.name}</button>`
    ).join('');
  },

  // 全フォームのお気に入りボタンを更新
  refreshAllFavButtons() {
    document.querySelectorAll('.fav-list').forEach(el => {
      const prefix = el.id.replace('_favList', '');
      this.renderFavButtons(prefix);
    });
  },

  // プリセット用の短縮名自動生成
  beyConfigToShortName(config) {
    let blade = '';
    if (config.bladeType === 'CX') {
      const ab = (config.assistBlade || '').replace(/（.*?）/g, '');
      if (config.cxType === 'over') {
        const ob = (config.overBlade || '').replace(/（.*?）/g, '');
        blade = [config.lockChip, config.metalBlade, ob, ab].filter(Boolean).join(' ');
      } else {
        blade = [config.lockChip, config.mainBlade, ab].filter(Boolean).join(' ');
      }
    } else {
      blade = config.blade || '';
    }
    const ratchet = config.ratchet || '';
    const bit = (config.bit || '').replace(/（.*?）/g, '');
    return `${blade} ${ratchet} ${bit}`.trim();
  },

  // 全フォームのプリセット関連UIを更新
  refreshAllPresetSelects() {
    this.refreshAllFavButtons();
  },

  // --- お気に入り機能 ---

  // Firebaseからお気に入りをリアルタイム取得
  startFavoritesListener() {
    if (this.favoritesListener) {
      database.ref('favorites').off('value', this.favoritesListener);
    }
    if (!this.currentUser) return;

    this.favoritesListener = database.ref('favorites/' + this.currentUser).on('value', snapshot => {
      this.favoritesCache = snapshot.val() || {};
      this.refreshAllPresetSelects();
      if (this.currentScreen === 'preset') {
        Preset.renderList();
      }
    });
  },

  // お気に入りのON/OFF切り替え
  toggleFavorite(presetId) {
    if (!this.currentUser) return;
    const ref = database.ref('favorites/' + this.currentUser + '/' + presetId);
    if (this.favoritesCache[presetId]) {
      ref.remove();
    } else {
      ref.set(true);
    }
  },

  // お気に入り判定
  isFavorite(presetId) {
    return !!this.favoritesCache[presetId];
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => App.init());

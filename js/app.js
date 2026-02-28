// メインアプリケーション
const App = {
  currentUser: null,
  currentScreen: 'passphrase',

  init() {
    // セッション中に認証済みならスキップ
    if (sessionStorage.getItem('authenticated') === 'true') {
      document.getElementById('screenPassphrase').classList.add('hidden');
      document.getElementById('screenUserSelect').classList.remove('hidden');
      this.currentScreen = 'userSelect';
    }
    this.renderUserGrid();
    this.renderPlayerFilter();
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
      view: 'screenView'
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

  // トースト通知
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  // ベイ構成フォームを生成
  createBeyForm(containerId, prefix) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
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
        <input type="text" id="${prefix}_blade" list="${prefix}_bladeList" placeholder="入力して検索..." autocomplete="off">
        <datalist id="${prefix}_bladeList"></datalist>
      </div>

      <!-- CX用の3パーツ選択 -->
      <div id="${prefix}_bladeCX" class="hidden">
        <div class="form-group">
          <label>Lock Chip</label>
          <select id="${prefix}_lockChip">
            <option value="">選択してください</option>
            ${BLADE_DATA.CX.lockChip.map(v => `<option value="${v}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Main Blade</label>
          <select id="${prefix}_mainBlade">
            <option value="">選択してください</option>
            ${BLADE_DATA.CX.mainBlade.map(v => `<option value="${v}">${v}</option>`).join('')}
          </select>
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
    `;
  },

  // Bladeタイプ変更
  onBladeTypeChange(prefix) {
    const type = document.getElementById(`${prefix}_bladeType`).value;
    const simpleEl = document.getElementById(`${prefix}_bladeSimple`);
    const cxEl = document.getElementById(`${prefix}_bladeCX`);
    const bladeInput = document.getElementById(`${prefix}_blade`);
    const bladeList = document.getElementById(`${prefix}_bladeList`);

    simpleEl.classList.add('hidden');
    cxEl.classList.add('hidden');

    if (type === 'CX') {
      cxEl.classList.remove('hidden');
      // CXの入力欄をリセット
      document.getElementById(`${prefix}_lockChip`).value = '';
      document.getElementById(`${prefix}_mainBlade`).value = '';
      document.getElementById(`${prefix}_assistBlade`).value = '';
    } else if (type && BLADE_DATA[type]) {
      simpleEl.classList.remove('hidden');
      bladeInput.value = '';
      bladeList.innerHTML = BLADE_DATA[type].map(b => `<option value="${b}">`).join('');
    }
  },

  // Ratchetキー変更
  onRatchetKeyChange(prefix) {
    const key = document.getElementById(`${prefix}_ratchetKey`).value;
    const valueWrap = document.getElementById(`${prefix}_ratchetValueWrap`);
    const valueSelect = document.getElementById(`${prefix}_ratchetValue`);
    const bitSection = document.getElementById(`${prefix}_bitSection`);
    const isBitTogether = RATCHET_DATA.bitTogether.includes(key);

    if (isBitTogether) {
      valueWrap.classList.add('hidden');
      bitSection.classList.add('hidden');
    } else if (key && RATCHET_DATA.simpleRatchet[key]) {
      valueWrap.classList.remove('hidden');
      bitSection.classList.remove('hidden');
      valueSelect.innerHTML = '<option value="">選択してください</option>' +
        RATCHET_DATA.simpleRatchet[key].map(v => `<option value="${v}">${v}</option>`).join('');
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
      assistBlade: null,
      ratchetType: isBitTogether ? 'bitTogether' : 'simpleRatchet',
      ratchet: null,
      bit: null
    };

    // Blade
    if (bladeType === 'CX') {
      config.lockChip = document.getElementById(`${prefix}_lockChip`).value;
      config.mainBlade = document.getElementById(`${prefix}_mainBlade`).value;
      config.assistBlade = document.getElementById(`${prefix}_assistBlade`).value;
      config.blade = `${config.lockChip} ${config.mainBlade} ${config.assistBlade}`;
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
      parts.push(`${config.lockChip} ${config.mainBlade} ${config.assistBlade}`);
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
      if (!config.mainBlade) return 'Main Bladeを選択してください';
      if (!config.assistBlade) return 'Assist Bladeを選択してください';
    } else {
      if (!config.blade) return 'Bladeを選択してください';
    }

    const ratchetKey = document.getElementById(`${prefix}_ratchetKey`).value;
    if (!ratchetKey) return 'Ratchetを選択してください';

    if (!config.ratchet) return 'Ratchetを選択してください';

    if (config.ratchetType === 'simpleRatchet' && !config.bit) {
      return 'Bitを選択してください';
    }

    return null;
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => App.init());

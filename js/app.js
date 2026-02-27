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
        <select id="${prefix}_blade"></select>
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
        <label>Ratchetタイプ</label>
        <select id="${prefix}_ratchetType" onchange="App.onRatchetTypeChange('${prefix}')">
          <option value="">選択してください</option>
          <option value="simpleRatchet">Simple Ratchet</option>
          <option value="bitTogether">Bit Together</option>
        </select>
      </div>

      <!-- Simple Ratchet用 -->
      <div id="${prefix}_ratchetSimple" class="hidden">
        <div class="form-group">
          <label>Ratchet番号</label>
          <select id="${prefix}_ratchetKey" onchange="App.onRatchetKeyChange('${prefix}')">
            <option value="">選択してください</option>
            ${Object.keys(RATCHET_DATA.simpleRatchet).map(k => `<option value="${k}">${k}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Ratchet値</label>
          <select id="${prefix}_ratchetValue">
            <option value="">先に番号を選択</option>
          </select>
        </div>
      </div>

      <!-- Bit Together用 -->
      <div class="form-group hidden" id="${prefix}_ratchetBitTogether">
        <label>Bit Together</label>
        <select id="${prefix}_bitTogether">
          <option value="">選択してください</option>
          ${RATCHET_DATA.bitTogether.map(v => `<option value="${v}">${v}</option>`).join('')}
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
    const bladeSelect = document.getElementById(`${prefix}_blade`);

    simpleEl.classList.add('hidden');
    cxEl.classList.add('hidden');

    if (type === 'CX') {
      cxEl.classList.remove('hidden');
    } else if (type && BLADE_DATA[type]) {
      simpleEl.classList.remove('hidden');
      bladeSelect.innerHTML = '<option value="">選択してください</option>' +
        BLADE_DATA[type].map(b => `<option value="${b}">${b}</option>`).join('');
    }
  },

  // Ratchetタイプ変更
  onRatchetTypeChange(prefix) {
    const type = document.getElementById(`${prefix}_ratchetType`).value;
    const simpleEl = document.getElementById(`${prefix}_ratchetSimple`);
    const btEl = document.getElementById(`${prefix}_ratchetBitTogether`);
    const bitSection = document.getElementById(`${prefix}_bitSection`);

    simpleEl.classList.add('hidden');
    btEl.classList.add('hidden');

    if (type === 'simpleRatchet') {
      simpleEl.classList.remove('hidden');
      bitSection.classList.remove('hidden');
    } else if (type === 'bitTogether') {
      btEl.classList.remove('hidden');
      bitSection.classList.add('hidden');
    }
  },

  // Ratchetキー変更
  onRatchetKeyChange(prefix) {
    const key = document.getElementById(`${prefix}_ratchetKey`).value;
    const valueSelect = document.getElementById(`${prefix}_ratchetValue`);

    if (key && RATCHET_DATA.simpleRatchet[key]) {
      valueSelect.innerHTML = '<option value="">選択してください</option>' +
        RATCHET_DATA.simpleRatchet[key].map(v => `<option value="${v}">${v}</option>`).join('');
    } else {
      valueSelect.innerHTML = '<option value="">先に番号を選択</option>';
    }
  },

  // ベイ構成データを取得
  getBeyConfig(prefix) {
    const bladeType = document.getElementById(`${prefix}_bladeType`).value;
    const ratchetType = document.getElementById(`${prefix}_ratchetType`).value;

    const config = {
      bladeType: bladeType,
      blade: null,
      lockChip: null,
      mainBlade: null,
      assistBlade: null,
      ratchetType: ratchetType,
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
    if (ratchetType === 'simpleRatchet') {
      const key = document.getElementById(`${prefix}_ratchetKey`).value;
      const value = document.getElementById(`${prefix}_ratchetValue`).value;
      config.ratchet = key && value ? `${key}-${value}` : null;
    } else if (ratchetType === 'bitTogether') {
      config.ratchet = document.getElementById(`${prefix}_bitTogether`).value;
    }

    // Bit
    if (ratchetType !== 'bitTogether') {
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

    if (!config.ratchetType) return 'Ratchetタイプを選択してください';

    if (config.ratchetType === 'simpleRatchet') {
      if (!config.ratchet) return 'Ratchetを選択してください';
      if (!config.bit) return 'Bitを選択してください';
    } else if (config.ratchetType === 'bitTogether') {
      if (!config.ratchet) return 'Bit Togetherを選択してください';
    }

    return null;
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => App.init());

// 戦績登録ロジック
const Register = {
  stadium: null,
  battleType: null,
  battleFormat: '1on1',
  finishPoints: null,
  winCondition: DEFAULT_WIN_CONDITION,
  rounds: [],
  scores: { player1: 0, player2: 0 },

  // 3on3用
  player1Beys: [],
  player2Beys: [],
  beyPairIndex: 0,
  beyFreeSelect: false,
  selectedBeyP1: null,
  selectedBeyP2: null,
  usedBeysP1: [],
  usedBeysP2: [],

  // チーム戦用
  teamA: [],
  teamB: [],
  teamMatches: [],
  currentMatchIndex: 0,
  teamCurrentPlayerA: null,
  teamCurrentPlayerB: null,
  teamBeyConfigs: {},
  teamScores: { a: 0, b: 0 },
  teamRounds: [],

  init() {
    this.stadium = null;
    this.battleType = null;
    this.battleFormat = '1on1';
    this.rounds = [];
    this.scores = { player1: 0, player2: 0 };
    this.selectedWinner = null;
    this.player1Beys = [];
    this.player2Beys = [];
    this.beyPairIndex = 0;
    this.beyFreeSelect = false;
    this.selectedBeyP1 = null;
    this.selectedBeyP2 = null;
    this.usedBeysP1 = [];
    this.usedBeysP2 = [];
    this.teamA = [];
    this.teamB = [];
    this.teamARegular = [];
    this.teamBRegular = [];
    this.teamAOtherActive = false;
    this.teamBOtherActive = false;
    this.teamMatches = [];
    this.currentMatchIndex = 0;
    this.teamBeyConfigs = {};
    this.teamScores = { a: 0, b: 0 };
    this.teamRounds = [];
    this.teamSelectedWinner = null;
    this.finishPoints = JSON.parse(JSON.stringify(DEFAULT_FINISH_POINTS));
    this.winCondition = DEFAULT_WIN_CONDITION;
    this._pendingFormCreated = false;
    this._pendingFormIndex = -1;
    this._pendingTeamFormCreated = false;
    this._pendingTeamPlayer = null;
    this.pendingBeyIndex = -1;
    this.pendingTeamPlayer = null;
    this._saving = false;
    this._saved = false;
    const saveBtn = document.getElementById('saveBattleBtn');
    if (saveBtn) saveBtn.disabled = false;

    this.renderStadiumSelect();
    this.renderPlayerSelects();

    // 表示リセット
    document.getElementById('registerStep1').classList.remove('hidden');
    document.getElementById('registerStep2').classList.add('hidden');
    document.getElementById('registerIndividual').classList.add('hidden');
    document.getElementById('registerTeam').classList.add('hidden');
    document.getElementById('battleProgress').classList.add('hidden');
    document.getElementById('teamBattleProgress').classList.add('hidden');
    document.getElementById('battleResult').classList.add('hidden');
    document.getElementById('pendingBeyInput').classList.add('hidden');
    document.getElementById('pendingTeamBeyInput').classList.add('hidden');
  },

  // バトル画面から設定画面に戻る（進行データはリセット、ベイ構成は保持）
  backToSetup() {
    if (this.rounds.length > 0 || this.teamMatches.length > 0) {
      if (!confirm('バトル進行中です。設定画面に戻るとバトルデータはリセットされます。よろしいですか？')) return;
    }

    // getBeyConfigの結果にratchetKey/Valueを付与してsetBeyConfig用にする
    const prepareForSetBey = (config) => {
      if (!config) return null;
      const c = { ...config };
      if (c.ratchetType === 'bitTogether') {
        c.ratchetKey = c.ratchet;
        c.ratchetValue = '';
      } else if (c.ratchet) {
        const parts = c.ratchet.split('-');
        c.ratchetKey = parts[0] || '';
        c.ratchetValue = parts[1] || '';
      }
      return c;
    };

    // 3on3: バトル中に入力されたP2ベイを設定フォームに書き戻す
    if (this.battleFormat === '3on3' && this.player2Beys) {
      for (let i = 1; i < 3; i++) {
        if (this.player2Beys[i]) {
          App.setBeyConfig(`p2_3on3_${i}`, prepareForSetBey(this.player2Beys[i]));
        }
      }
    }

    // チーム戦: バトル中に入力されたチームBベイを設定フォームに書き戻す
    if (this.battleType === 'team' && this.teamB) {
      for (let i = 1; i < this.teamB.length; i++) {
        const bey = this.teamBeyConfigs[`B:${this.teamB[i]}`];
        if (bey) {
          App.setBeyConfig(`team_B_${i}`, prepareForSetBey(bey));
        }
      }
    }

    this.reset();
  },

  reset() {
    // バトル進行データのみリセット（ベイ構成・ユーザー選択は保持）
    this.rounds = [];
    this.scores = { player1: 0, player2: 0 };
    this.selectedWinner = null;
    this.beyPairIndex = 0;
    this.beyFreeSelect = false;
    this.selectedBeyP1 = null;
    this.selectedBeyP2 = null;
    this.usedBeysP1 = [];
    this.usedBeysP2 = [];
    this.teamMatches = [];
    this.currentMatchIndex = 0;
    this.teamScores = { a: 0, b: 0 };
    this.teamRounds = [];
    this.teamSelectedWinner = null;
    this.finishPoints = JSON.parse(JSON.stringify(DEFAULT_FINISH_POINTS));
    this.winCondition = DEFAULT_WIN_CONDITION;
    this._pendingFormCreated = false;
    this._pendingFormIndex = -1;
    this._pendingTeamFormCreated = false;
    this._pendingTeamPlayer = null;
    this.pendingBeyIndex = -1;
    this.pendingTeamPlayer = null;
    this._saving = false;
    this._saved = false;
    const saveBtn = document.getElementById('saveBattleBtn');
    if (saveBtn) saveBtn.disabled = false;

    // 画面をステップ1に戻す（スタジアム選択済みならステップ2も表示）
    document.getElementById('registerStep1').classList.remove('hidden');
    document.getElementById('registerStep2').classList.toggle('hidden', !this.stadium);
    document.getElementById('registerIndividual').classList.toggle('hidden', this.battleType !== 'individual');
    document.getElementById('registerTeam').classList.toggle('hidden', this.battleType !== 'team');
    document.getElementById('battleProgress').classList.add('hidden');
    document.getElementById('teamBattleProgress').classList.add('hidden');
    document.getElementById('battleResult').classList.add('hidden');
    document.getElementById('pendingBeyInput').classList.add('hidden');
    document.getElementById('pendingTeamBeyInput').classList.add('hidden');
  },

  // スタジアム選択の描画
  renderStadiumSelect() {
    const container = document.getElementById('stadiumSelect');
    container.innerHTML = Object.entries(STADIUMS).map(([key, name]) =>
      `<div class="select-option" onclick="Register.selectStadium('${key}')">${name}</div>`
    ).join('');
  },

  // プレイヤー選択の描画
  renderPlayerSelects() {
    const currentUser = App.currentUser || '';
    const p1Options = '<option value="">選択してください</option>' +
      USERS.map(u => `<option value="${u}"${u === currentUser ? ' selected' : ''}>${u}</option>`).join('');
    const p2Options = '<option value="">選択してください</option>' +
      USERS.map(u => `<option value="${u}">${u}</option>`).join('') +
      '<option value="__other__">その他</option>';
    const p1 = document.getElementById('player1Select');
    const p2 = document.getElementById('player2Select');
    if (p1) {
      p1.innerHTML = p1Options;
      p1.onchange = () => this.onPlayerSelectChange();
    }
    if (p2) {
      p2.innerHTML = p2Options;
      p2.onchange = () => this.onPlayerSelectChange();
    }
    // 初期値でP1のお気に入りを設定
    this.onPlayerSelectChange();
  },

  // プレイヤー選択変更時にベイフォームのお気に入りを更新
  onPlayerSelectChange() {
    const p1Name = document.getElementById('player1Select').value;
    const p2Select = document.getElementById('player2Select');
    const isOther = p2Select && p2Select.value === '__other__';
    const p2Name = isOther ? null : (p2Select && p2Select.value) || null;

    // 1on1フォーム
    if (p1Name) App.formUserMap['p1'] = p1Name;
    App.formUserMap['p2'] = p2Name || '';

    // 3on3フォーム
    for (let i = 0; i < 3; i++) {
      if (p1Name) App.formUserMap[`p1_3on3_${i}`] = p1Name;
      App.formUserMap[`p2_3on3_${i}`] = p2Name || '';
    }

    App.refreshAllFavButtons();

    // 「その他」の場合、P2フォームを手動入力タブに切替
    if (isOther) {
      App.switchBeyTab('p2', 'manual');
      for (let i = 0; i < 3; i++) {
        App.switchBeyTab(`p2_3on3_${i}`, 'manual');
      }
    }
  },

  // プレイヤー2の名前を取得
  getPlayer2Name() {
    const select = document.getElementById('player2Select');
    if (select.value === '__other__') {
      return 'その他';
    }
    return select.value;
  },

  // スタジアム選択
  selectStadium(stadium) {
    this.stadium = stadium;
    document.querySelectorAll('#stadiumSelect .select-option').forEach(el => {
      el.classList.toggle('active', el.textContent === STADIUMS[stadium]);
    });
    document.getElementById('registerStep2').classList.remove('hidden');
  },

  // バトル種別選択
  selectBattleType(type) {
    this.battleType = type;
    document.querySelectorAll('#registerStep2 .select-option').forEach(el => {
      el.classList.remove('active');
    });
    event.target.classList.add('active');

    document.getElementById('registerIndividual').classList.add('hidden');
    document.getElementById('registerTeam').classList.add('hidden');

    if (type === 'individual') {
      document.getElementById('registerIndividual').classList.remove('hidden');
      this.battleFormat = '1on1';
      this.selectBattleFormat('1on1');
    } else {
      document.getElementById('registerTeam').classList.remove('hidden');
      this.renderTeamSelect();
    }
  },

  // バトル形式選択（1on1 / 3on3）
  selectBattleFormat(format) {
    this.battleFormat = format;

    // ボタンのアクティブ状態
    document.querySelectorAll('.format-selector .select-option').forEach(el => {
      el.classList.toggle('active', el.textContent === format);
    });

    // 3on3: 勝利条件を4点固定
    const winCondEl = document.getElementById('winCondition');
    const is3on3 = format === '3on3';
    if (is3on3) {
      winCondEl.value = 4;
      winCondEl.disabled = true;
    } else {
      winCondEl.disabled = false;
    }

    // 1on1 / 3on3 のベイフォーム切替
    document.getElementById('player1Bey').classList.toggle('hidden', is3on3);
    document.getElementById('player2Bey').classList.toggle('hidden', is3on3);
    document.getElementById('player1Bey3on3').classList.toggle('hidden', !is3on3);
    document.getElementById('player2Bey3on3').classList.toggle('hidden', !is3on3);

    const p1Name = document.getElementById('player1Select').value || undefined;
    const p2Sel = document.getElementById('player2Select');
    const p2IsOther = p2Sel && p2Sel.value === '__other__';
    const p2Name = p2IsOther ? '' : ((p2Sel && p2Sel.value) || undefined);

    if (is3on3) {
      for (let i = 0; i < 3; i++) {
        App.createBeyForm(`p1_3on3_${i}_form`, `p1_3on3_${i}`, { forUser: p1Name });
        App.createBeyForm(`p2_3on3_${i}_form`, `p2_3on3_${i}`, { forUser: p2Name });
      }
    } else {
      App.createBeyForm('player1BeyForm', 'p1', { forUser: p1Name });
      App.createBeyForm('player2BeyForm', 'p2', { forUser: p2Name });
    }
  },

  // チーム選択の描画
  renderTeamSelect() {
    this.teamA = [];
    this.teamB = [];
    this.teamARegular = [];
    this.teamBRegular = [];
    this.teamAOtherActive = false;
    this.teamBOtherActive = false;
    const renderGrid = (containerId, team) => {
      const container = document.getElementById(containerId);
      container.innerHTML = USERS.map(user =>
        `<div class="user-btn" onclick="Register.toggleTeamMember('${team}', '${user}', this)">${user}</div>`
      ).join('') +
        `<div class="user-btn" onclick="Register.toggleTeamMember('${team}', 'その他', this)">その他</div>`;
    };
    renderGrid('teamASelect', 'A');
    renderGrid('teamBSelect', 'B');
    document.getElementById('teamBeyConfigs').classList.add('hidden');
  },

  // チームメンバー選択トグル
  toggleTeamMember(team, user, el) {
    const isOther = user === 'その他';

    if (isOther) {
      // 「その他」トグル：残りスロットをその他で埋める
      if (team === 'A') {
        this.teamAOtherActive = !this.teamAOtherActive;
        el.classList.toggle('active', this.teamAOtherActive);
      } else {
        this.teamBOtherActive = !this.teamBOtherActive;
        el.classList.toggle('active', this.teamBOtherActive);
      }
    } else {
      const regularArr = team === 'A' ? this.teamARegular : this.teamBRegular;
      const otherTeamRegular = team === 'A' ? this.teamBRegular : this.teamARegular;

      // 相手チームに既にいる場合は無視
      if (otherTeamRegular.includes(user)) {
        App.showToast('このプレイヤーは相手チームに選択されています', 'error');
        return;
      }

      const idx = regularArr.indexOf(user);
      if (idx > -1) {
        regularArr.splice(idx, 1);
        el.classList.remove('active');
      } else {
        if (regularArr.length >= 3) {
          App.showToast('3人まで選択可能です', 'error');
          return;
        }
        regularArr.push(user);
        el.classList.add('active');
      }
    }

    this.updateTeamArrays();
  },

  // チーム配列の更新（通常メンバー＋その他で埋める）
  updateTeamArrays() {
    // チームA構築
    this.teamA = [...this.teamARegular];
    if (this.teamAOtherActive) {
      let count = 1;
      while (this.teamA.length < 3) {
        this.teamA.push(`その他${count}`);
        count++;
      }
    }

    // チームB構築
    this.teamB = [...this.teamBRegular];
    if (this.teamBOtherActive) {
      let count = 1;
      while (this.teamB.length < 3) {
        this.teamB.push(`その他${count}`);
        count++;
      }
    }

    // 両チーム3人揃ったらベイ構成表示
    if (this.teamA.length === 3 && this.teamB.length === 3) {
      this.renderTeamBeyConfigs();
    } else {
      document.getElementById('teamBeyConfigs').classList.add('hidden');
    }
  },

  // チーム戦のベイ構成の描画
  renderTeamBeyConfigs() {
    const container = document.getElementById('teamBeyConfigs');
    container.classList.remove('hidden');
    let html = '<h3 class="card-title" style="margin-top:20px;">各メンバーのベイ構成</h3>';

    [...this.teamA, ...this.teamB].forEach((user, i) => {
      const team = i < 3 ? 'A' : 'B';
      const memberIdx = i % 3;
      const prefix = `team_${team}_${memberIdx}`;
      const optionalLabel = (team === 'B' && memberIdx > 0)
        ? ' <span class="optional-label">（後から入��可）</span>' : '';
      html += `
        <div class="bey-config">
          <div class="bey-config-title">${team === 'A' ? 'チームA' : 'チームB'} - ${user}${optionalLabel}</div>
          <div id="${prefix}_form"></div>
        </div>`;
    });

    container.innerHTML = html;

    // ベイフォーム初期化（各メンバーのお気に入りを表示）
    [...this.teamA, ...this.teamB].forEach((user, i) => {
      const team = i < 3 ? 'A' : 'B';
      const prefix = `team_${team}_${i % 3}`;
      App.createBeyForm(`${prefix}_form`, prefix, { forUser: user });
    });
  },

  // バトル開始（個人戦）
  startBattle() {
    this.winCondition = this.battleFormat === '3on3' ? 4 : (parseInt(document.getElementById('winCondition').value) || DEFAULT_WIN_CONDITION);

    const p1Name = document.getElementById('player1Select').value;
    const p2Name = this.getPlayer2Name();

    if (!p1Name || !p2Name) {
      App.showToast('両方のプレイヤーを選択してください', 'error');
      return;
    }
    if (p1Name === p2Name) {
      App.showToast('異なるプレイヤーを選択してください', 'error');
      return;
    }

    if (this.battleFormat === '3on3') {
      // 3on3: P1は3ベイ全てバリデーション
      for (let i = 0; i < 3; i++) {
        const err1 = App.validateBeyConfig(`p1_3on3_${i}`);
        if (err1) { App.showToast(`P1 Bey${i + 1}: ${err1}`, 'error'); return; }
      }
      // P2はBey①のみ必須、②③は任意（後から入力可）
      const err2_0 = App.validateBeyConfig(`p2_3on3_0`);
      if (err2_0) { App.showToast(`P2 Bey1: ${err2_0}`, 'error'); return; }

      this.player1Beys = [];
      this.player2Beys = [];
      for (let i = 0; i < 3; i++) {
        this.player1Beys.push(App.getBeyConfig(`p1_3on3_${i}`));
      }
      this.player2Beys.push(App.getBeyConfig(`p2_3on3_0`));
      // P2 Bey②③: 入力済みならバリデーション、未入力ならnull
      for (let i = 1; i < 3; i++) {
        const err = App.validateBeyConfig(`p2_3on3_${i}`);
        if (!err) {
          this.player2Beys.push(App.getBeyConfig(`p2_3on3_${i}`));
        } else {
          // bladeTypeが未選択 = 未入力とみなしnull
          const bladeType = document.getElementById(`p2_3on3_${i}_bladeType`).value;
          if (!bladeType) {
            this.player2Beys.push(null);
          } else {
            // 途中まで入力されている場合はエラー表示
            App.showToast(`P2 Bey${i + 1}: ${err}`, 'error');
            return;
          }
        }
      }
      // パーツ重複チェック（P1は全3ベイ、P2は入力済みのもののみ）
      const dupErr1 = App.validateBeyDuplicates(this.player1Beys);
      if (dupErr1) { App.showToast(`${p1Name}: ${dupErr1}`, 'error'); return; }
      const p2FilledBeys = this.player2Beys.filter(b => b !== null);
      if (p2FilledBeys.length > 1) {
        const dupErr2 = App.validateBeyDuplicates(p2FilledBeys);
        if (dupErr2) { App.showToast(`${p2Name}: ${dupErr2}`, 'error'); return; }
      }
      this.player1 = { name: p1Name };
      this.player2 = { name: p2Name };
      this.beyPairIndex = 0;
      this.beyFreeSelect = false;
      this.selectedBeyP1 = null;
      this.selectedBeyP2 = null;
      this.usedBeysP1 = [];
      this.usedBeysP2 = [];
    } else {
      // 1on1: 既存のバリデーション
      const err1 = App.validateBeyConfig('p1');
      if (err1) { App.showToast(`P1: ${err1}`, 'error'); return; }
      const err2 = App.validateBeyConfig('p2');
      if (err2) { App.showToast(`P2: ${err2}`, 'error'); return; }

      this.player1 = { name: p1Name, bey: App.getBeyConfig('p1') };
      this.player2 = { name: p2Name, bey: App.getBeyConfig('p2') };
    }

    this.rounds = [];
    this.scores = { player1: 0, player2: 0 };

    // 設定画面を隠してバトル画面表示
    document.getElementById('registerStep1').classList.add('hidden');
    document.getElementById('registerStep2').classList.add('hidden');
    document.getElementById('registerIndividual').classList.add('hidden');
    document.getElementById('battleProgress').classList.remove('hidden');

    this.renderBattleUI();
  },

  // バトルUIの描画
  renderBattleUI() {
    const pendingEl = document.getElementById('pendingBeyInput');

    // 3on3: P2のベイが未入力の場合、入力フォームを表示
    if (this.battleFormat === '3on3' && !this.beyFreeSelect &&
        this.player2Beys[this.beyPairIndex] === null) {
      pendingEl.classList.remove('hidden');
      document.getElementById('finishSelect').classList.add('hidden');
      document.getElementById('pendingBeyTitle').textContent =
        `${this.player2.name} の Bey${this.beyPairIndex + 1} を入力してください`;
      this.pendingBeyIndex = this.beyPairIndex;
      // フォームが未生成の場合のみ生成
      if (!this._pendingFormCreated || this._pendingFormIndex !== this.beyPairIndex) {
        App.createBeyForm('pendingBeyForm', 'pending_p2', { forUser: this.player2.name });
        this._pendingFormCreated = true;
        this._pendingFormIndex = this.beyPairIndex;
      }
      return;
    }
    pendingEl.classList.add('hidden');

    // 3on3: 現在のベイ対戦表示
    const matchupEl = document.getElementById('currentBeyMatchup');
    const pickerEl = document.getElementById('beyPickerArea');
    if (this.battleFormat === '3on3') {
      if (this.beyFreeSelect) {
        // 残り1つなら自動選択
        const availP1 = [0, 1, 2].filter(i => !this.usedBeysP1.includes(i));
        const availP2 = [0, 1, 2].filter(i => !this.usedBeysP2.includes(i));
        if (availP1.length === 1 && this.selectedBeyP1 === null) {
          this.selectedBeyP1 = availP1[0];
        }
        if (availP2.length === 1 && this.selectedBeyP2 === null) {
          this.selectedBeyP2 = availP2[0];
        }

        // 自由選択モード: ベイ対戦表示は選択後のみ、ピッカーはラウンド履歴の下
        matchupEl.classList.toggle('hidden', this.selectedBeyP1 === null || this.selectedBeyP2 === null);
        if (this.selectedBeyP1 !== null && this.selectedBeyP2 !== null) {
          matchupEl.innerHTML = `
            <div class="bey-matchup-label">Bey${this.selectedBeyP1 + 1} vs Bey${this.selectedBeyP2 + 1}</div>
            <div class="bey-matchup-names">${App.beyConfigToString(this.player1Beys[this.selectedBeyP1])} vs ${App.beyConfigToString(this.player2Beys[this.selectedBeyP2])}</div>
          `;
        }

        // ベイ選択ピッカー（ラウンド履歴の下）
        const renderBeyPicker = (playerName, beys, playerKey, selectedIdx, usedBeys) => {
          return `<div class="bey-picker">
            <div class="bey-picker-label">${playerName} のベイを選択</div>
            <div class="bey-picker-options">
              ${beys.map((b, i) => {
                const isUsed = usedBeys.includes(i);
                const isActive = selectedIdx === i;
                const cls = isUsed ? 'bey-picker-btn used' : (isActive ? 'bey-picker-btn active' : 'bey-picker-btn');
                const onclick = isUsed ? '' : `onclick="Register.selectBeyForRound('${playerKey}', ${i})"`;
                return `<div class="${cls}" ${onclick}>
                  Bey${i + 1}: ${App.beyConfigToString(b)}${isUsed ? '（使用済み）' : ''}
                </div>`;
              }).join('')}
            </div>
          </div>`;
        };
        // 両方自動選択済みならピッカー非表示
        if (availP1.length <= 1 && availP2.length <= 1) {
          pickerEl.classList.add('hidden');
        } else {
          pickerEl.classList.remove('hidden');
          pickerEl.innerHTML =
            renderBeyPicker(this.player1.name, this.player1Beys, 'p1', this.selectedBeyP1, this.usedBeysP1) +
            renderBeyPicker(this.player2.name, this.player2Beys, 'p2', this.selectedBeyP2, this.usedBeysP2);
        }
      } else {
        // 順番通りモード（R1〜R3）
        matchupEl.classList.remove('hidden');
        const bey1 = this.player1Beys[this.beyPairIndex];
        const bey2 = this.player2Beys[this.beyPairIndex];
        matchupEl.innerHTML = `
          <div class="bey-matchup-label">Bey${this.beyPairIndex + 1} vs Bey${this.beyPairIndex + 1}</div>
          <div class="bey-matchup-names">${App.beyConfigToString(bey1)} vs ${App.beyConfigToString(bey2)}</div>
        `;
        pickerEl.classList.add('hidden');
      }
    } else {
      matchupEl.classList.add('hidden');
      pickerEl.classList.add('hidden');
    }

    // スコアボード
    const sb = document.getElementById('scoreboard');
    const p1Win = this.scores.player1 >= this.winCondition;
    const p2Win = this.scores.player2 >= this.winCondition;
    sb.innerHTML = `
      <div class="score-player">
        <div class="score-name">${this.player1.name}</div>
        <div class="score-value ${p1Win ? 'winner' : ''}">${this.scores.player1}</div>
      </div>
      <div class="score-vs">VS</div>
      <div class="score-player">
        <div class="score-name">${this.player2.name}</div>
        <div class="score-value ${p2Win ? 'winner' : ''}">${this.scores.player2}</div>
      </div>
    `;

    // ラウンド履歴
    const list = document.getElementById('roundList');
    list.innerHTML = this.rounds.map((r, i) => {
      let beyLabel = '';
      if (this.battleFormat === '3on3') {
        if (r.beyPairIndex !== undefined) {
          beyLabel = ` [Bey${r.beyPairIndex + 1} vs Bey${r.beyPairIndex + 1}]`;
        } else if (r.beyPairP1 !== undefined && r.beyPairP2 !== undefined) {
          beyLabel = ` [Bey${r.beyPairP1 + 1} vs Bey${r.beyPairP2 + 1}]`;
        }
      }
      return `<li class="round-item">
        <span class="round-number">R${i + 1}</span>
        <span class="round-winner">${r.winnerName}${beyLabel}</span>
        <span class="round-finish">${this.finishPoints[r.finishType].name} (+${r.points})</span>
      </li>`;
    }).join('');

    // 勝者選択ボタン
    const winnerBtns = document.getElementById('roundWinnerButtons');
    winnerBtns.innerHTML = `
      <button class="btn ${this.selectedWinner === 'player1' ? 'btn-primary' : 'btn-outline'}" onclick="Register.selectRoundWinner('player1')">${this.player1.name}</button>
      <button class="btn ${this.selectedWinner === 'player2' ? 'btn-primary' : 'btn-outline'}" onclick="Register.selectRoundWinner('player2')">${this.player2.name}</button>
    `;

    // フィニッシュボタン（勝者選択後に表示）
    const finishBtns = document.getElementById('finishButtons');
    if (this.selectedWinner) {
      finishBtns.innerHTML = Object.entries(this.finishPoints).map(([key, data]) =>
        `<button class="finish-btn" onclick="Register.recordRound('${key}')">
          ${data.name}
          <span class="finish-points">+${data.points}点</span>
        </button>`
      ).join('');
    } else {
      finishBtns.innerHTML = '';
    }

    // バトル終了判定
    if (this.scores.player1 >= this.winCondition || this.scores.player2 >= this.winCondition) {
      document.getElementById('finishSelect').classList.add('hidden');
      this.showResult();
    } else if (this.battleFormat === '3on3' && this.beyFreeSelect &&
               (this.selectedBeyP1 === null || this.selectedBeyP2 === null)) {
      // 自由選択モードでベイ未選択 → 勝者/フィニッシュを非表示
      document.getElementById('finishSelect').classList.add('hidden');
    } else {
      document.getElementById('finishSelect').classList.remove('hidden');
    }
  },

  // 個人戦の勝者選択
  selectRoundWinner(winner) {
    this.selectedWinner = winner;
    this.renderBattleUI();
  },

  // 3on3: バトル中にP2のベイを入力確定
  submitPendingBey() {
    const err = App.validateBeyConfig('pending_p2');
    if (err) { App.showToast(err, 'error'); return; }

    const newBey = App.getBeyConfig('pending_p2');
    const idx = this.pendingBeyIndex;

    // 既存のP2ベイとの重複チェック
    const filledBeys = this.player2Beys.filter(b => b !== null);
    filledBeys.push(newBey);
    const dupErr = App.validateBeyDuplicates(filledBeys);
    if (dupErr) { App.showToast(`${this.player2.name}: ${dupErr}`, 'error'); return; }

    this.player2Beys[idx] = newBey;
    this._pendingFormCreated = false;
    App.showToast(`${this.player2.name} の Bey${idx + 1} を登録しました`);
    this.renderBattleUI();
  },

  // 3on3: ラウンドごとのベイ選択
  selectBeyForRound(playerKey, beyIndex) {
    if (playerKey === 'p1') {
      this.selectedBeyP1 = this.selectedBeyP1 === beyIndex ? null : beyIndex;
    } else {
      this.selectedBeyP2 = this.selectedBeyP2 === beyIndex ? null : beyIndex;
    }
    this.renderBattleUI();
  },

  // ラウンド記録
  recordRound(finishType) {
    const winner = this.selectedWinner;
    const points = this.finishPoints[finishType].points;
    const winnerName = winner === 'player1' ? this.player1.name : this.player2.name;

    const round = { winner, winnerName, finishType, points };
    if (this.battleFormat === '3on3') {
      if (this.beyFreeSelect) {
        round.beyPairP1 = this.selectedBeyP1;
        round.beyPairP2 = this.selectedBeyP2;
      } else {
        round.beyPairIndex = this.beyPairIndex;
      }
    }

    this.rounds.push(round);
    this.scores[winner] += points;
    this.selectedWinner = null;

    // 3on3: 勝利条件未達の場合、ベイペアを進める
    if (this.battleFormat === '3on3' &&
        this.scores.player1 < this.winCondition &&
        this.scores.player2 < this.winCondition) {
      if (this.beyFreeSelect) {
        // 自由選択モード: 使用済みベイに追加
        this.usedBeysP1.push(this.selectedBeyP1);
        this.usedBeysP2.push(this.selectedBeyP2);
        this.selectedBeyP1 = null;
        this.selectedBeyP2 = null;
        // 3つ使い切ったら次のサイクルへリセット
        if (this.usedBeysP1.length >= 3) {
          this.usedBeysP1 = [];
          this.usedBeysP2 = [];
        }
      } else {
        this.beyPairIndex++;
        if (this.beyPairIndex >= 3) {
          // 1サイクル終了 → 次サイクルへリセットして自由選択モード
          this.beyFreeSelect = true;
          this.selectedBeyP1 = null;
          this.selectedBeyP2 = null;
          this.usedBeysP1 = [];
          this.usedBeysP2 = [];
          App.showToast('次のサイクル: ベイを選んでください');
        }
      }
    }

    this.renderBattleUI();
  },

  // 結果表示
  showResult() {
    const isP1Win = this.scores.player1 >= this.winCondition;
    const winner = isP1Win ? this.player1 : this.player2;
    const loser = isP1Win ? this.player2 : this.player1;

    document.getElementById('battleResult').classList.remove('hidden');
    document.getElementById('winnerBanner').innerHTML = `
      <h2>${winner.name} WIN!</h2>
      <p>${this.scores.player1} - ${this.scores.player2}</p>
    `;

    let beyInfo = '';
    if (this.battleFormat === '3on3') {
      beyInfo = `
        <p><strong>${this.player1.name}:</strong></p>
        ${this.player1Beys.map((b, i) => `<p style="padding-left:12px;">Bey${i + 1}: ${App.beyConfigToString(b)}</p>`).join('')}
        <p><strong>${this.player2.name}:</strong></p>
        ${this.player2Beys.map((b, i) => `<p style="padding-left:12px;">Bey${i + 1}: ${App.beyConfigToString(b)}</p>`).join('')}
      `;
    } else {
      beyInfo = `
        <p><strong>${winner.name}:</strong> ${App.beyConfigToString(winner.bey)}</p>
        <p><strong>${loser.name}:</strong> ${App.beyConfigToString(loser.bey)}</p>
      `;
    }

    document.getElementById('battleResultDetail').innerHTML = `
      <div style="font-size:0.85rem;color:var(--text-secondary);">
        ${beyInfo}
        <p><strong>スタジアム:</strong> ${STADIUMS[this.stadium]}</p>
        <p><strong>ラウンド数:</strong> ${this.rounds.length}</p>
      </div>
    `;
  },

  // チーム戦開始
  startTeamBattle() {
    if (this.teamA.length !== 3 || this.teamB.length !== 3) {
      App.showToast('各チーム3人を選択してください', 'error');
      return;
    }

    // チームA: 全員バリデーション
    for (let i = 0; i < 3; i++) {
      const errA = App.validateBeyConfig(`team_A_${i}`);
      if (errA) { App.showToast(`チームA ${this.teamA[i]}: ${errA}`, 'error'); return; }
    }
    // チームB: 1人目は必須、2,3人目は任意（後から入力可）
    const errB0 = App.validateBeyConfig(`team_B_0`);
    if (errB0) { App.showToast(`チームB ${this.teamB[0]}: ${errB0}`, 'error'); return; }

    // ベイ構成を保存（チーム識別付きキーで衝突回避）
    const teamABeys = [];
    const teamBBeys = [];
    for (let i = 0; i < 3; i++) {
      const beyA = App.getBeyConfig(`team_A_${i}`);
      teamABeys.push(beyA);
      this.teamBeyConfigs[`A:${this.teamA[i]}`] = beyA;
    }
    // チームB: 1人目
    const beyB0 = App.getBeyConfig(`team_B_0`);
    teamBBeys.push(beyB0);
    this.teamBeyConfigs[`B:${this.teamB[0]}`] = beyB0;
    // チームB: 2,3人目は任意
    for (let i = 1; i < 3; i++) {
      const errB = App.validateBeyConfig(`team_B_${i}`);
      if (!errB) {
        const beyB = App.getBeyConfig(`team_B_${i}`);
        teamBBeys.push(beyB);
        this.teamBeyConfigs[`B:${this.teamB[i]}`] = beyB;
      } else {
        const bladeType = document.getElementById(`team_B_${i}_bladeType`).value;
        if (!bladeType) {
          teamBBeys.push(null);
          // 未入力 → teamBeyConfigsには登録しない
        } else {
          App.showToast(`チームB ${this.teamB[i]}: ${errB}`, 'error');
          return;
        }
      }
    }

    // パーツ重複チェック
    const dupErrA = App.validateBeyDuplicates(teamABeys);
    if (dupErrA) { App.showToast(`チームA: ${dupErrA}`, 'error'); return; }
    const teamBFilled = teamBBeys.filter(b => b !== null);
    if (teamBFilled.length > 1) {
      const dupErrB = App.validateBeyDuplicates(teamBFilled);
      if (dupErrB) { App.showToast(`チームB: ${dupErrB}`, 'error'); return; }
    }

    this.teamMatches = [];
    this.currentMatchIndex = 0;
    this.teamCurrentPlayerA = this.teamA[0];
    this.teamCurrentPlayerB = this.teamB[0];
    this.teamARemaining = [...this.teamA];
    this.teamBRemaining = [...this.teamB];

    // 画面切替
    document.getElementById('registerStep1').classList.add('hidden');
    document.getElementById('registerStep2').classList.add('hidden');
    document.getElementById('registerTeam').classList.add('hidden');
    document.getElementById('teamBattleProgress').classList.remove('hidden');

    this.teamScores = { a: 0, b: 0 };
    this.teamRounds = [];
    this.renderTeamBattleUI();
  },

  // チーム戦: バトル中にチームBのベイを入力確定
  submitPendingTeamBey() {
    const err = App.validateBeyConfig('pending_teamB');
    if (err) { App.showToast(err, 'error'); return; }

    const newBey = App.getBeyConfig('pending_teamB');
    const player = this.pendingTeamPlayer;

    // 既存のチームBベイとの重複チェック
    const filledBeys = this.teamB
      .map(name => this.teamBeyConfigs[`B:${name}`])
      .filter(b => b != null);
    filledBeys.push(newBey);
    const dupErr = App.validateBeyDuplicates(filledBeys);
    if (dupErr) { App.showToast(`チームB: ${dupErr}`, 'error'); return; }

    this.teamBeyConfigs[`B:${player}`] = newBey;
    this._pendingTeamFormCreated = false;
    App.showToast(`${player} のベイを登録しました`);
    this.renderTeamBattleUI();
  },

  // チーム戦UIの描画
  renderTeamBattleUI() {
    const pA = this.teamCurrentPlayerA;
    const pB = this.teamCurrentPlayerB;
    const pendingTeamEl = document.getElementById('pendingTeamBeyInput');

    // チームBの現在プレイヤーのベイが未設定の場合、入力フォームを表示
    if (!this.teamBeyConfigs[`B:${pB}`]) {
      pendingTeamEl.classList.remove('hidden');
      document.getElementById('teamFinishSelect').classList.add('hidden');
      document.getElementById('pendingTeamBeyTitle').textContent =
        `チームB ${pB} のベイを入力してください`;
      this.pendingTeamPlayer = pB;
      if (!this._pendingTeamFormCreated || this._pendingTeamPlayer !== pB) {
        App.createBeyForm('pendingTeamBeyForm', 'pending_teamB', { forUser: pB });
        this._pendingTeamFormCreated = true;
        this._pendingTeamPlayer = pB;
      }
      // メンバー状態とマッチタイトルだけ表示
      document.getElementById('teamMatchTitle').textContent =
        `マッチ ${this.currentMatchIndex + 1}: ${pA} vs ${pB}`;
      return;
    }
    pendingTeamEl.classList.add('hidden');

    // メンバー状態表示
    const statusEl = document.getElementById('teamMemberStatus');
    const renderMembers = (team, remaining, current, label, colorClass) => {
      return `<div class="team-status">
        <div class="team-status-label ${colorClass}">${label}</div>
        <div class="team-status-members">
          ${team.map(name => {
            const isOut = !remaining.includes(name);
            const isCurrent = name === current;
            let cls = 'team-member-chip';
            if (isOut) cls += ' eliminated';
            else if (isCurrent) cls += ' active';
            return `<span class="${cls}">${name}</span>`;
          }).join('')}
        </div>
      </div>`;
    };
    statusEl.innerHTML =
      renderMembers(this.teamA, this.teamARemaining, pA, 'チームA', 'team-a') +
      renderMembers(this.teamB, this.teamBRemaining, pB, 'チームB', 'team-b');

    document.getElementById('teamMatchTitle').textContent =
      `マッチ ${this.currentMatchIndex + 1}: ${pA} vs ${pB}`;

    // スコアボード
    const sb = document.getElementById('teamScoreboard');
    sb.innerHTML = `
      <div class="score-player">
        <div class="score-name">${pA}</div>
        <div class="score-value ${this.teamScores.a >= 2 ? 'winner' : ''}">${this.teamScores.a}</div>
      </div>
      <div class="score-vs">VS</div>
      <div class="score-player">
        <div class="score-name">${pB}</div>
        <div class="score-value ${this.teamScores.b >= 2 ? 'winner' : ''}">${this.teamScores.b}</div>
      </div>
    `;

    // ラウンド履歴
    const list = document.getElementById('teamRoundList');
    list.innerHTML = this.teamRounds.map((r, i) =>
      `<li class="round-item">
        <span class="round-number">R${i + 1}</span>
        <span class="round-winner">${r.winnerName}</span>
        <span class="round-finish">${DEFAULT_FINISH_POINTS[r.finishType].name} (+${r.points})</span>
      </li>`
    ).join('');

    // 勝者選択ボタン
    const winnerBtns = document.getElementById('teamRoundWinnerButtons');
    winnerBtns.innerHTML = `
      <button class="btn ${this.teamSelectedWinner === 'a' ? 'btn-primary' : 'btn-outline'}" onclick="Register.selectTeamRoundWinner('a')">${pA}</button>
      <button class="btn ${this.teamSelectedWinner === 'b' ? 'btn-primary' : 'btn-outline'}" onclick="Register.selectTeamRoundWinner('b')">${pB}</button>
    `;

    // フィニッシュボタン（勝者選択後に表示）
    const finishBtns = document.getElementById('teamFinishButtons');
    if (this.teamSelectedWinner) {
      finishBtns.innerHTML = Object.entries(DEFAULT_FINISH_POINTS).map(([key, data]) =>
        `<button class="finish-btn" onclick="Register.recordTeamRound('${key}')">
          ${data.name}
          <span class="finish-points">+${data.points}点</span>
        </button>`
      ).join('');
    } else {
      finishBtns.innerHTML = '';
    }

    // マッチ終了判定
    if (this.teamScores.a >= 2 || this.teamScores.b >= 2) {
      document.getElementById('teamFinishSelect').classList.add('hidden');
      this.endTeamMatch();
    } else {
      document.getElementById('teamFinishSelect').classList.remove('hidden');
    }
  },

  // チーム戦の勝者選択
  selectTeamRoundWinner(winner) {
    this.teamSelectedWinner = winner;
    this.renderTeamBattleUI();
  },

  // チーム戦ラウンド記録
  recordTeamRound(finishType) {
    const winner = this.teamSelectedWinner;
    const points = DEFAULT_FINISH_POINTS[finishType].points;
    const winnerName = winner === 'a' ? this.teamCurrentPlayerA : this.teamCurrentPlayerB;

    this.teamRounds.push({ winner, winnerName, finishType, points });
    this.teamScores[winner] += points;
    this.teamSelectedWinner = null;

    this.renderTeamBattleUI();
  },

  // チーム戦マッチ終了
  endTeamMatch() {
    const matchWinner = this.teamScores.a >= 2 ? 'a' : 'b';
    const loserSide = matchWinner === 'a' ? 'b' : 'a';

    this.teamMatches.push({
      playerA: {
        name: this.teamCurrentPlayerA,
        bey: this.teamBeyConfigs[`A:${this.teamCurrentPlayerA}`]
      },
      playerB: {
        name: this.teamCurrentPlayerB,
        bey: this.teamBeyConfigs[`B:${this.teamCurrentPlayerB}`]
      },
      rounds: [...this.teamRounds],
      scores: { ...this.teamScores },
      winner: matchWinner === 'a' ? this.teamCurrentPlayerA : this.teamCurrentPlayerB
    });

    // 敗者をリストから除外
    if (loserSide === 'a') {
      this.teamARemaining = this.teamARemaining.filter(p => p !== this.teamCurrentPlayerA);
    } else {
      this.teamBRemaining = this.teamBRemaining.filter(p => p !== this.teamCurrentPlayerB);
    }

    // チーム戦終了判定
    if (this.teamARemaining.length === 0 || this.teamBRemaining.length === 0) {
      this.showTeamResult();
      return;
    }

    // 次のマッチへ
    this.currentMatchIndex++;
    if (loserSide === 'a') {
      this.teamCurrentPlayerA = this.teamARemaining[0];
    } else {
      this.teamCurrentPlayerB = this.teamBRemaining[0];
    }

    this.teamScores = { a: 0, b: 0 };
    this.teamRounds = [];

    setTimeout(() => {
      App.showToast(`次のマッチ: ${this.teamCurrentPlayerA} vs ${this.teamCurrentPlayerB}`);
      this.renderTeamBattleUI();
    }, 500);
  },

  // チーム戦結果表示
  showTeamResult() {
    const winnerTeam = this.teamARemaining.length > 0 ? 'A' : 'B';
    const winnerMembers = winnerTeam === 'A' ? this.teamA : this.teamB;

    document.getElementById('teamBattleProgress').classList.add('hidden');
    document.getElementById('battleResult').classList.remove('hidden');

    document.getElementById('winnerBanner').innerHTML = `
      <h2>チーム${winnerTeam} WIN!</h2>
      <p>${winnerMembers.join(' / ')}</p>
    `;

    let detail = '<div style="font-size:0.85rem;color:var(--text-secondary);">';
    detail += `<p><strong>スタジアム:</strong> ${STADIUMS[this.stadium]}</p>`;
    detail += '<h4 style="margin:12px 0 8px;color:var(--text-primary);">マッチ結果</h4>';
    this.teamMatches.forEach((m, i) => {
      detail += `<p>マッチ${i + 1}: ${m.playerA.name} vs ${m.playerB.name} → <strong>${m.winner}</strong> WIN (${m.scores.a}-${m.scores.b})</p>`;
    });
    detail += '</div>';

    document.getElementById('battleResultDetail').innerHTML = detail;
  },

  // 結果をFirebaseに保存
  saveBattle() {
    if (this._saving || this._saved) return;
    this._saving = true;
    const saveBtn = document.getElementById('saveBattleBtn');
    if (saveBtn) saveBtn.disabled = true;

    const onSuccess = (msg) => {
      this._saving = false;
      this._saved = true;
      App.showToast(msg);
    };
    const onError = (err) => {
      this._saving = false;
      if (saveBtn) saveBtn.disabled = false;
      App.showToast('保存に失敗しました: ' + err.message, 'error');
    };

    const battleId = Date.now().toString();

    if (this.battleType === 'individual') {
      const players = this.battleFormat === '3on3' ? {
        player1: { name: this.player1.name, beys: this.player1Beys },
        player2: { name: this.player2.name, beys: this.player2Beys }
      } : {
        player1: { name: this.player1.name, bey: this.player1.bey },
        player2: { name: this.player2.name, bey: this.player2.bey }
      };

      const data = {
        timestamp: Date.now(),
        stadium: this.stadium,
        type: 'individual',
        battleFormat: this.battleFormat,
        winCondition: this.winCondition,
        finishPoints: Object.fromEntries(
          Object.entries(this.finishPoints).map(([k, v]) => [k, v.points])
        ),
        players: players,
        rounds: this.rounds,
        winner: this.scores.player1 >= this.winCondition ? this.player1.name : this.player2.name,
        finalScore: { player1: this.scores.player1, player2: this.scores.player2 },
        registeredBy: App.currentUser
      };

      database.ref('battles/' + battleId).set(data)
        .then(() => onSuccess('戦績を保存しました！'))
        .catch(onError);
    } else {
      const winnerTeam = this.teamARemaining.length > 0 ? 'A' : 'B';
      const data = {
        timestamp: Date.now(),
        stadium: this.stadium,
        type: 'team',
        teamA: this.teamA,
        teamB: this.teamB,
        matches: this.teamMatches,
        winnerTeam: winnerTeam,
        registeredBy: App.currentUser
      };

      database.ref('battles/' + battleId).set(data)
        .then(() => onSuccess('チーム戦の戦績を保存しました！'))
        .catch(onError);
    }
  }
};

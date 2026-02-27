// 戦績登録ロジック
const Register = {
  stadium: null,
  battleType: null,
  finishPoints: null,
  winCondition: DEFAULT_WIN_CONDITION,
  rounds: [],
  scores: { player1: 0, player2: 0 },

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
    this.rounds = [];
    this.scores = { player1: 0, player2: 0 };
    this.teamA = [];
    this.teamB = [];
    this.teamMatches = [];
    this.currentMatchIndex = 0;
    this.teamBeyConfigs = {};
    this.teamScores = { a: 0, b: 0 };
    this.teamRounds = [];
    this.finishPoints = JSON.parse(JSON.stringify(DEFAULT_FINISH_POINTS));
    this.winCondition = DEFAULT_WIN_CONDITION;

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
  },

  reset() {
    this.init();
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
    const p1Options = '<option value="">選択してください</option>' +
      USERS.map(u => `<option value="${u}">${u}</option>`).join('');
    const p2Options = '<option value="">選択してください</option>' +
      USERS.map(u => `<option value="${u}">${u}</option>`).join('') +
      '<option value="__other__">その他</option>';
    const p1 = document.getElementById('player1Select');
    const p2 = document.getElementById('player2Select');
    if (p1) p1.innerHTML = p1Options;
    if (p2) p2.innerHTML = p2Options;
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
      App.createBeyForm('player1BeyForm', 'p1');
      App.createBeyForm('player2BeyForm', 'p2');
    } else {
      document.getElementById('registerTeam').classList.remove('hidden');
      this.renderTeamSelect();
    }
  },

  // チーム選択の描画
  renderTeamSelect() {
    this.teamA = [];
    this.teamB = [];
    const renderGrid = (containerId, team) => {
      const container = document.getElementById(containerId);
      container.innerHTML = USERS.map(user =>
        `<div class="user-btn" onclick="Register.toggleTeamMember('${team}', '${user}', this)">${user}</div>`
      ).join('');
    };
    renderGrid('teamASelect', 'A');
    renderGrid('teamBSelect', 'B');
    document.getElementById('teamBeyConfigs').classList.add('hidden');
  },

  // チームメンバー選択トグル
  toggleTeamMember(team, user, el) {
    const arr = team === 'A' ? this.teamA : this.teamB;
    const otherArr = team === 'A' ? this.teamB : this.teamA;

    // 相手チームに既にいる場合は無視
    if (otherArr.includes(user)) {
      App.showToast('このプレイヤーは相手チームに選択されています', 'error');
      return;
    }

    const idx = arr.indexOf(user);
    if (idx > -1) {
      arr.splice(idx, 1);
      el.classList.remove('active');
    } else {
      if (arr.length >= 3) {
        App.showToast('3人まで選択可能です', 'error');
        return;
      }
      arr.push(user);
      el.classList.add('active');
    }

    // 両チーム3人揃ったらベイ構成表示
    if (this.teamA.length === 3 && this.teamB.length === 3) {
      this.renderTeamBeyConfigs();
    }
  },

  // チーム戦のベイ構成の描画
  renderTeamBeyConfigs() {
    const container = document.getElementById('teamBeyConfigs');
    container.classList.remove('hidden');
    let html = '<h3 class="card-title" style="margin-top:20px;">各メンバーのベイ構成</h3>';

    [...this.teamA, ...this.teamB].forEach((user, i) => {
      const team = i < 3 ? 'A' : 'B';
      const prefix = `team_${team}_${i % 3}`;
      html += `
        <div class="bey-config">
          <div class="bey-config-title">${team === 'A' ? 'チームA' : 'チームB'} - ${user}</div>
          <div id="${prefix}_form"></div>
        </div>`;
    });

    container.innerHTML = html;

    // ベイフォーム初期化
    [...this.teamA, ...this.teamB].forEach((user, i) => {
      const team = i < 3 ? 'A' : 'B';
      const prefix = `team_${team}_${i % 3}`;
      App.createBeyForm(`${prefix}_form`, prefix);
    });
  },

  // バトル開始（個人戦）
  startBattle() {
    this.winCondition = parseInt(document.getElementById('winCondition').value) || DEFAULT_WIN_CONDITION;

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

    // ベイ構成バリデーション
    const err1 = App.validateBeyConfig('p1');
    if (err1) { App.showToast(`P1: ${err1}`, 'error'); return; }
    const err2 = App.validateBeyConfig('p2');
    if (err2) { App.showToast(`P2: ${err2}`, 'error'); return; }

    this.player1 = { name: p1Name, bey: App.getBeyConfig('p1') };
    this.player2 = { name: p2Name, bey: App.getBeyConfig('p2') };
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
    list.innerHTML = this.rounds.map((r, i) =>
      `<li class="round-item">
        <span class="round-number">R${i + 1}</span>
        <span class="round-winner">${r.winnerName}</span>
        <span class="round-finish">${this.finishPoints[r.finishType].name} (+${r.points})</span>
      </li>`
    ).join('');

    // 勝者選択
    const winnerSelect = document.getElementById('roundWinner');
    winnerSelect.innerHTML = `
      <option value="player1">${this.player1.name}</option>
      <option value="player2">${this.player2.name}</option>
    `;

    // フィニッシュボタン
    const finishBtns = document.getElementById('finishButtons');
    finishBtns.innerHTML = Object.entries(this.finishPoints).map(([key, data]) =>
      `<button class="finish-btn" onclick="Register.recordRound('${key}')">
        ${data.name}
        <span class="finish-points">+${data.points}点</span>
      </button>`
    ).join('');

    // バトル終了判定
    if (this.scores.player1 >= this.winCondition || this.scores.player2 >= this.winCondition) {
      document.getElementById('finishSelect').classList.add('hidden');
      this.showResult();
    } else {
      document.getElementById('finishSelect').classList.remove('hidden');
    }
  },

  // ラウンド記録
  recordRound(finishType) {
    const winner = document.getElementById('roundWinner').value;
    const points = this.finishPoints[finishType].points;
    const winnerName = winner === 'player1' ? this.player1.name : this.player2.name;

    this.rounds.push({ winner, winnerName, finishType, points });
    this.scores[winner] += points;

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

    document.getElementById('battleResultDetail').innerHTML = `
      <div style="font-size:0.85rem;color:var(--text-secondary);">
        <p><strong>${winner.name}:</strong> ${App.beyConfigToString(winner.bey)}</p>
        <p><strong>${loser.name}:</strong> ${App.beyConfigToString(loser.bey)}</p>
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

    // ベイ構成バリデーション
    for (let i = 0; i < 3; i++) {
      const errA = App.validateBeyConfig(`team_A_${i}`);
      if (errA) { App.showToast(`チームA ${this.teamA[i]}: ${errA}`, 'error'); return; }
      const errB = App.validateBeyConfig(`team_B_${i}`);
      if (errB) { App.showToast(`チームB ${this.teamB[i]}: ${errB}`, 'error'); return; }
    }

    // ベイ構成を保存
    for (let i = 0; i < 3; i++) {
      this.teamBeyConfigs[this.teamA[i]] = App.getBeyConfig(`team_A_${i}`);
      this.teamBeyConfigs[this.teamB[i]] = App.getBeyConfig(`team_B_${i}`);
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

  // チーム戦UIの描画
  renderTeamBattleUI() {
    const pA = this.teamCurrentPlayerA;
    const pB = this.teamCurrentPlayerB;

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

    // 勝者選択
    const winnerSelect = document.getElementById('teamRoundWinner');
    winnerSelect.innerHTML = `
      <option value="a">${pA}</option>
      <option value="b">${pB}</option>
    `;

    // フィニッシュボタン
    const finishBtns = document.getElementById('teamFinishButtons');
    finishBtns.innerHTML = Object.entries(DEFAULT_FINISH_POINTS).map(([key, data]) =>
      `<button class="finish-btn" onclick="Register.recordTeamRound('${key}')">
        ${data.name}
        <span class="finish-points">+${data.points}点</span>
      </button>`
    ).join('');

    // マッチ終了判定
    if (this.teamScores.a >= 2 || this.teamScores.b >= 2) {
      document.getElementById('teamFinishSelect').classList.add('hidden');
      this.endTeamMatch();
    } else {
      document.getElementById('teamFinishSelect').classList.remove('hidden');
    }
  },

  // チーム戦ラウンド記録
  recordTeamRound(finishType) {
    const winner = document.getElementById('teamRoundWinner').value;
    const points = DEFAULT_FINISH_POINTS[finishType].points;
    const winnerName = winner === 'a' ? this.teamCurrentPlayerA : this.teamCurrentPlayerB;

    this.teamRounds.push({ winner, winnerName, finishType, points });
    this.teamScores[winner] += points;

    this.renderTeamBattleUI();
  },

  // チーム戦マッチ終了
  endTeamMatch() {
    const matchWinner = this.teamScores.a >= 2 ? 'a' : 'b';
    const loserSide = matchWinner === 'a' ? 'b' : 'a';

    this.teamMatches.push({
      playerA: {
        name: this.teamCurrentPlayerA,
        bey: this.teamBeyConfigs[this.teamCurrentPlayerA]
      },
      playerB: {
        name: this.teamCurrentPlayerB,
        bey: this.teamBeyConfigs[this.teamCurrentPlayerB]
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
    const battleId = Date.now().toString();

    if (this.battleType === 'individual') {
      const data = {
        timestamp: Date.now(),
        stadium: this.stadium,
        type: 'individual',
        winCondition: this.winCondition,
        finishPoints: Object.fromEntries(
          Object.entries(this.finishPoints).map(([k, v]) => [k, v.points])
        ),
        players: {
          player1: { name: this.player1.name, bey: this.player1.bey },
          player2: { name: this.player2.name, bey: this.player2.bey }
        },
        rounds: this.rounds,
        winner: this.scores.player1 >= this.winCondition ? this.player1.name : this.player2.name,
        finalScore: { player1: this.scores.player1, player2: this.scores.player2 },
        registeredBy: App.currentUser
      };

      database.ref('battles/' + battleId).set(data)
        .then(() => {
          App.showToast('戦績を保存しました！');
        })
        .catch(err => {
          App.showToast('保存に失敗しました: ' + err.message, 'error');
        });
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
        .then(() => {
          App.showToast('チーム戦の戦績を保存しました！');
        })
        .catch(err => {
          App.showToast('保存に失敗しました: ' + err.message, 'error');
        });
    }
  }
};

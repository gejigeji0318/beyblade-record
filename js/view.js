// 戦績閲覧ロジック
const View = {
  battles: [],
  listener: null,

  init() {
    this.setupFilters();
    this.startListening();
  },

  // フィルターのイベント設定
  setupFilters() {
    document.getElementById('filterType').addEventListener('change', () => this.render());
    document.getElementById('filterStadium').addEventListener('change', () => this.render());
    document.getElementById('filterPlayer').addEventListener('change', () => this.render());
    document.getElementById('filterDateFrom').addEventListener('change', () => this.render());
    document.getElementById('filterDateTo').addEventListener('change', () => this.render());
  },

  // Firebaseからリアルタイム取得
  startListening() {
    if (this.listener) {
      database.ref('battles').off('value', this.listener);
    }

    this.listener = database.ref('battles').on('value', snapshot => {
      this.battles = [];
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([id, battle]) => {
          battle.id = id;
          this.battles.push(battle);
        });
        // 新しい順にソート
        this.battles.sort((a, b) => b.timestamp - a.timestamp);
      }
      this.render();
    });
  },

  // フィルター適用
  getFilteredBattles() {
    const typeFilter = document.getElementById('filterType').value;
    const stadiumFilter = document.getElementById('filterStadium').value;
    const playerFilter = document.getElementById('filterPlayer').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    const dateFromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const dateToTs = dateTo ? new Date(dateTo).getTime() + 86399999 : null;

    return this.battles.filter(b => {
      if (typeFilter !== 'all' && b.type !== typeFilter) return false;
      if (stadiumFilter !== 'all' && b.stadium !== stadiumFilter) return false;
      if (dateFromTs && b.timestamp < dateFromTs) return false;
      if (dateToTs && b.timestamp > dateToTs) return false;
      if (playerFilter !== 'all') {
        if (b.type === 'individual') {
          if (b.players.player1.name !== playerFilter && b.players.player2.name !== playerFilter) {
            return false;
          }
        } else if (b.type === 'team') {
          if (!b.teamA.includes(playerFilter) && !b.teamB.includes(playerFilter)) {
            return false;
          }
        }
      }
      return true;
    });
  },

  // 描画
  render() {
    const filtered = this.getFilteredBattles();
    this.renderStats(filtered);
    this.renderTable(filtered);
  },

  // 統計の描画
  renderStats(battles) {
    const playerFilter = document.getElementById('filterPlayer').value;
    const grid = document.getElementById('statsGrid');

    if (playerFilter === 'all') {
      // 全体統計
      const total = battles.length;
      const individual = battles.filter(b => b.type === 'individual').length;
      const team = battles.filter(b => b.type === 'team').length;

      grid.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${total}</div>
          <div class="stat-label">総対戦数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${individual}</div>
          <div class="stat-label">個人戦</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${team}</div>
          <div class="stat-label">チーム戦</div>
        </div>
      `;
    } else {
      // 個人統計
      let wins = 0;
      let losses = 0;

      battles.forEach(b => {
        if (b.type === 'individual') {
          if (b.winner === playerFilter) wins++;
          else losses++;
        } else if (b.type === 'team') {
          const inA = b.teamA.includes(playerFilter);
          const inB = b.teamB.includes(playerFilter);
          if (inA && b.winnerTeam === 'A') wins++;
          else if (inB && b.winnerTeam === 'B') wins++;
          else if (inA || inB) losses++;
        }
      });

      const total = wins + losses;
      const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

      grid.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${total}</div>
          <div class="stat-label">対戦数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--success)">${wins}</div>
          <div class="stat-label">勝利</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--danger)">${losses}</div>
          <div class="stat-label">敗北</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${rate}%</div>
          <div class="stat-label">勝率</div>
        </div>
      `;
    }
  },

  // ベイ構成を短縮テキストに変換（例: ウィザードロッド1-60H）
  beyToShortString(config) {
    if (!config) return '?';
    let blade = '';
    if (config.bladeType === 'CX') {
      const ab = (config.assistBlade || '').replace(/（.*?）/g, '');
      if (config.cxType === 'over') {
        const ob = (config.overBlade || '').replace(/（.*?）/g, '');
        blade = `${config.lockChip || ''}${config.metalBlade || ''}${ob}${ab}`.trim();
      } else {
        blade = `${config.lockChip || ''} ${config.mainBlade || ''} ${ab}`.trim();
      }
    } else {
      blade = config.blade || '?';
    }
    const ratchet = config.ratchet || '';
    const bit = (config.bit || '').replace(/（.*?）/g, '');
    return `${blade}${ratchet}${bit}`;
  },

  // テーブルの描画
  renderTable(battles) {
    const tbody = document.getElementById('battleTableBody');
    const noData = document.getElementById('noDataMessage');

    if (battles.length === 0) {
      tbody.innerHTML = '';
      noData.classList.remove('hidden');
      return;
    }

    noData.classList.add('hidden');

    this.filteredBattles = battles;

    tbody.innerHTML = battles.map((b, idx) => {
      const date = new Date(b.timestamp);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      const stadium = STADIUMS[b.stadium] || b.stadium;
      let typeName = 'チーム戦';
      if (b.type === 'individual') {
        typeName = b.battleFormat === '3on3' ? '3on3' : '1on1';
      }

      let matchup, score, winner, beyMatchup;

      if (b.type === 'individual') {
        const is3on3 = b.battleFormat === '3on3';
        matchup = `${b.players.player1.name}<br>vs<br>${b.players.player2.name}`;
        score = `${b.finalScore.player1} - ${b.finalScore.player2}`;
        winner = b.winner;
        if (is3on3 && b.players.player1.beys) {
          const beys1 = b.players.player1.beys.map(b => this.beyToShortString(b)).join('<br>');
          const beys2 = b.players.player2.beys.map(b => this.beyToShortString(b)).join('<br>');
          beyMatchup = `${beys1}<br>vs<br>${beys2}`;
        } else {
          const bey1 = this.beyToShortString(b.players.player1.bey);
          const bey2 = this.beyToShortString(b.players.player2.bey);
          beyMatchup = `${bey1}<br>vs<br>${bey2}`;
        }
      } else {
        matchup = `${b.teamA.join(',')}<br>vs<br>${b.teamB.join(',')}`;
        const winsA = b.matches.filter(m => b.teamA.includes(m.winner)).length;
        const winsB = b.matches.filter(m => b.teamB.includes(m.winner)).length;
        score = `${winsA} - ${winsB}`;
        winner = `チーム${b.winnerTeam}`;
        beyMatchup = b.matches.map(m =>
          `${this.beyToShortString(m.playerA.bey)}<br>vs<br>${this.beyToShortString(m.playerB.bey)}`
        ).join('<br><br>');
      }

      return `<tr onclick="View.showDetail(${idx})">
        <td><span class="badge ${b.type === 'individual' ? 'badge-attack' : 'badge-stamina'}">${typeName}</span></td>
        <td style="font-size:0.8rem;">${stadium}</td>
        <td style="font-size:0.8rem;">${beyMatchup}</td>
        <td>${matchup}</td>
        <td>${score}</td>
        <td><span class="badge badge-win">${winner}</span></td>
        <td>${dateStr}</td>
        <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); View.deleteBattle('${b.id}')">削除</button></td>
      </tr>`;
    }).join('');
  },

  // 詳細モーダル表示
  showDetail(idx) {
    const b = this.filteredBattles[idx];
    if (!b) return;

    const date = new Date(b.timestamp);
    const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    const stadium = STADIUMS[b.stadium] || b.stadium;

    let html = '';

    if (b.type === 'individual') {
      const is3on3 = b.battleFormat === '3on3';
      const formatLabel = is3on3 ? '3on3' : '1on1';

      // ベイ情報
      let beyHtml = '';
      if (is3on3 && b.players.player1.beys) {
        beyHtml = `
          <div class="modal-value"><strong>${b.players.player1.name}:</strong></div>
          ${b.players.player1.beys.map((bey, i) => `<div class="modal-value" style="padding-left:12px;">Bey${i + 1}: ${App.beyConfigToString(bey)}</div>`).join('')}
          <div class="modal-value" style="margin-top:4px;"><strong>${b.players.player2.name}:</strong></div>
          ${b.players.player2.beys.map((bey, i) => `<div class="modal-value" style="padding-left:12px;">Bey${i + 1}: ${App.beyConfigToString(bey)}</div>`).join('')}
        `;
      } else {
        const bey1 = App.beyConfigToString(b.players.player1.bey);
        const bey2 = App.beyConfigToString(b.players.player2.bey);
        beyHtml = `
          <div class="modal-value">${b.players.player1.name}: ${bey1}</div>
          <div class="modal-value">${b.players.player2.name}: ${bey2}</div>
        `;
      }

      html = `
        <h3>${b.players.player1.name} vs ${b.players.player2.name}（${formatLabel}）</h3>
        <div class="modal-section">
          <div class="modal-label">スタジアム</div>
          <div class="modal-value">${stadium}</div>
        </div>
        <div class="modal-section">
          <div class="modal-label">使用ベイ</div>
          ${beyHtml}
        </div>
        <div class="modal-section">
          <div class="modal-label">スコア</div>
          <div class="modal-value">${b.finalScore.player1} - ${b.finalScore.player2}　勝者: ${b.winner}</div>
        </div>
        <div class="modal-section">
          <div class="modal-label">ラウンド詳細</div>
          <ul class="modal-rounds">
            ${(b.rounds || []).map((r, i) => {
              let beyPairInfo = '';
              if (is3on3) {
                if (r.beyPairIndex !== undefined) {
                  beyPairInfo = ` [Bey${r.beyPairIndex + 1} vs Bey${r.beyPairIndex + 1}]`;
                } else if (r.beyPairP1 !== undefined && r.beyPairP2 !== undefined) {
                  beyPairInfo = ` [Bey${r.beyPairP1 + 1} vs Bey${r.beyPairP2 + 1}]`;
                }
              }
              return `<li>
                <span class="badge badge-win" style="min-width:32px;text-align:center;">R${i + 1}</span>
                <span>${r.winnerName}${beyPairInfo}</span>
                <span style="color:var(--text-muted);">${DEFAULT_FINISH_POINTS[r.finishType] ? DEFAULT_FINISH_POINTS[r.finishType].name : r.finishType} (+${r.points})</span>
              </li>`;
            }).join('')}
          </ul>
        </div>
        <div class="modal-section">
          <div class="modal-label">日時</div>
          <div class="modal-value">${dateStr}</div>
        </div>`;
    } else {
      html = `
        <h3>チーム戦</h3>
        <div class="modal-section">
          <div class="modal-label">スタジアム</div>
          <div class="modal-value">${stadium}</div>
        </div>
        <div class="modal-section">
          <div class="modal-label">チームA</div>
          <div class="modal-value">${b.teamA.join(', ')}</div>
          <div class="modal-label" style="margin-top:8px;">チームB</div>
          <div class="modal-value">${b.teamB.join(', ')}</div>
        </div>
        <div class="modal-section">
          <div class="modal-label">勝者</div>
          <div class="modal-value">チーム${b.winnerTeam}</div>
        </div>`;

      (b.matches || []).forEach((m, mi) => {
        const beyA = App.beyConfigToString(m.playerA.bey);
        const beyB = App.beyConfigToString(m.playerB.bey);
        html += `
        <div class="modal-section">
          <div class="modal-label">マッチ${mi + 1}: ${m.playerA.name} vs ${m.playerB.name}</div>
          <div class="modal-value" style="font-size:0.8rem;margin-bottom:4px;">${m.playerA.name}: ${beyA}<br>${m.playerB.name}: ${beyB}</div>
          <div class="modal-value">スコア: ${m.scores.a} - ${m.scores.b}　勝者: ${m.winner}</div>
          <ul class="modal-rounds">
            ${(m.rounds || []).map((r, i) => `<li>
              <span class="badge badge-win" style="min-width:32px;text-align:center;">R${i + 1}</span>
              <span>${r.winnerName}</span>
              <span style="color:var(--text-muted);">${DEFAULT_FINISH_POINTS[r.finishType] ? DEFAULT_FINISH_POINTS[r.finishType].name : r.finishType} (+${r.points})</span>
            </li>`).join('')}
          </ul>
        </div>`;
      });

      html += `
        <div class="modal-section">
          <div class="modal-label">日時</div>
          <div class="modal-value">${dateStr}</div>
        </div>`;
    }

    html += `
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="View.editBattle(${idx})">編集</button>
      </div>`;

    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.remove('hidden');
  },

  // 詳細モーダル閉じる
  closeDetail() {
    document.getElementById('modalOverlay').classList.add('hidden');
    this.editingBattle = null;
  },

  // ===== 編集機能 =====

  editingBattle: null,
  editData: null,

  // 編集モード開始
  editBattle(idx) {
    const b = this.filteredBattles[idx];
    if (!b) return;

    this.editingBattle = b;
    // deep copy for editing
    this.editData = JSON.parse(JSON.stringify(b));

    this.renderEditForm();
  },

  // ベイフォームの現在値をeditDataに保存（再描画前に呼ぶ）
  saveEditBeyState() {
    const b = this.editData;
    if (!b) return;
    try {
      if (b.type === 'individual') {
        const is3on3 = b.battleFormat === '3on3';
        if (is3on3 && b.players.player1.beys) {
          for (let i = 0; i < 3; i++) {
            if (document.getElementById(`edit_p1_${i}_bladeType`)) {
              b.players.player1.beys[i] = App.getBeyConfig(`edit_p1_${i}`);
            }
            if (document.getElementById(`edit_p2_${i}_bladeType`)) {
              b.players.player2.beys[i] = App.getBeyConfig(`edit_p2_${i}`);
            }
          }
        } else {
          if (document.getElementById('edit_p1_bladeType')) b.players.player1.bey = App.getBeyConfig('edit_p1');
          if (document.getElementById('edit_p2_bladeType')) b.players.player2.bey = App.getBeyConfig('edit_p2');
        }
      } else {
        (b.matches || []).forEach((m, mi) => {
          if (document.getElementById(`edit_m${mi}_a_bladeType`)) m.playerA.bey = App.getBeyConfig(`edit_m${mi}_a`);
          if (document.getElementById(`edit_m${mi}_b_bladeType`)) m.playerB.bey = App.getBeyConfig(`edit_m${mi}_b`);
        });
      }
    } catch (e) { /* フォーム未生成時は無視 */ }
  },

  // 編集フォーム描画
  renderEditForm() {
    this.saveEditBeyState();
    const b = this.editData;
    let html = '';

    if (b.type === 'individual') {
      html = this.renderIndividualEditForm(b);
    } else {
      html = this.renderTeamEditForm(b);
    }

    html += `
      <div class="modal-actions" style="margin-top:16px;">
        <button class="btn btn-primary" onclick="View.saveEdit()">保存</button>
        <button class="btn btn-outline" onclick="View.cancelEdit()">キャンセル</button>
      </div>`;

    document.getElementById('modalContent').innerHTML = html;

    // ベイフォームの初期化・プリフィル（DOMセット後に実行）
    this.initEditBeyForms(b);
  },

  // 折りたたみ式ベイ編集HTML
  beyCollapsible(prefix, summaryText) {
    return `<div class="bey-collapse">
      <div class="bey-collapse-header" onclick="View.toggleBeyForm('${prefix}')">
        <span class="bey-collapse-summary" id="${prefix}_summary">${summaryText}</span>
        <span class="bey-collapse-arrow" id="${prefix}_arrow">▶</span>
      </div>
      <div class="bey-collapse-body hidden" id="${prefix}_body">
        <div id="${prefix}_form"></div>
      </div>
    </div>`;
  },

  // ベイフォーム開閉トグル
  toggleBeyForm(prefix) {
    const body = document.getElementById(`${prefix}_body`);
    const arrow = document.getElementById(`${prefix}_arrow`);
    if (!body) return;
    const isOpen = !body.classList.contains('hidden');
    body.classList.toggle('hidden');
    if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
  },

  // ratchetをratchetKey/Valueに分解（setBeyConfig用）
  prepareForSetBey(config) {
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
  },

  // 編集フォーム内のベイフォーム初期化
  initEditBeyForms(b) {
    if (b.type === 'individual') {
      const is3on3 = b.battleFormat === '3on3';
      if (is3on3 && b.players.player1.beys) {
        for (let i = 0; i < 3; i++) {
          App.createBeyForm(`edit_p1_${i}_form`, `edit_p1_${i}`, { noTabs: true });
          if (b.players.player1.beys[i]) App.setBeyConfig(`edit_p1_${i}`, this.prepareForSetBey(b.players.player1.beys[i]));
          App.createBeyForm(`edit_p2_${i}_form`, `edit_p2_${i}`, { noTabs: true });
          if (b.players.player2.beys[i]) App.setBeyConfig(`edit_p2_${i}`, this.prepareForSetBey(b.players.player2.beys[i]));
        }
      } else {
        App.createBeyForm('edit_p1_form', 'edit_p1', { noTabs: true });
        if (b.players.player1.bey) App.setBeyConfig('edit_p1', this.prepareForSetBey(b.players.player1.bey));
        App.createBeyForm('edit_p2_form', 'edit_p2', { noTabs: true });
        if (b.players.player2.bey) App.setBeyConfig('edit_p2', this.prepareForSetBey(b.players.player2.bey));
      }
    } else {
      (b.matches || []).forEach((m, mi) => {
        App.createBeyForm(`edit_m${mi}_a_form`, `edit_m${mi}_a`, { noTabs: true });
        if (m.playerA.bey) App.setBeyConfig(`edit_m${mi}_a`, this.prepareForSetBey(m.playerA.bey));
        App.createBeyForm(`edit_m${mi}_b_form`, `edit_m${mi}_b`, { noTabs: true });
        if (m.playerB.bey) App.setBeyConfig(`edit_m${mi}_b`, this.prepareForSetBey(m.playerB.bey));
      });
    }
  },

  // 個人戦の編集フォーム
  renderIndividualEditForm(b) {
    const is3on3 = b.battleFormat === '3on3';
    const formatLabel = is3on3 ? '3on3' : '1on1';
    const p1Name = b.players.player1.name;
    const p2Name = b.players.player2.name;
    const finishTypes = b.finishPoints || { spin: 1, burst: 2, over: 2, extreme: 3 };

    let html = `<h3>${p1Name} vs ${p2Name}（${formatLabel}）- 編集中</h3>`;

    // スタジアム
    html += `
      <div class="modal-section">
        <div class="modal-label">スタジアム</div>
        <select id="editStadium" class="edit-select">
          ${Object.entries(STADIUMS).map(([k, v]) =>
            `<option value="${k}"${b.stadium === k ? ' selected' : ''}>${v}</option>`
          ).join('')}
        </select>
      </div>`;

    // ラウンド編集
    html += `
      <div class="modal-section">
        <div class="modal-label">ラウンド</div>
        <div id="editRounds">`;

    (b.rounds || []).forEach((r, i) => {
      if (is3on3 && i > 0 && i % 3 === 0) {
        html += `<div class="edit-cycle-divider">サイクル${Math.floor(i / 3) + 1}</div>`;
      }
      html += this.renderRoundEditRow(i, r, b);
    });

    html += `</div>
        <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="View.addRound()">+ ラウンド追加</button>
      </div>`;

    // スコアプレビュー
    const scores = this.calcScores(b);
    html += `
      <div class="modal-section">
        <div class="modal-label">スコア（自動計算）</div>
        <div class="modal-value" id="editScorePreview">${p1Name}: ${scores.p1} - ${p2Name}: ${scores.p2}　→ 勝者: ${scores.winner}</div>
      </div>`;

    // 使用ベイ（折りたたみ式）
    html += `<div class="modal-section"><div class="modal-label">使用ベイ（タップで編集）</div>`;
    if (is3on3 && b.players.player1.beys) {
      for (let i = 0; i < 3; i++) {
        const summary1 = `${p1Name} Bey${i + 1}: ${App.beyConfigToString(b.players.player1.beys[i])}`;
        html += this.beyCollapsible(`edit_p1_${i}`, summary1);
      }
      for (let i = 0; i < 3; i++) {
        const summary2 = `${p2Name} Bey${i + 1}: ${App.beyConfigToString(b.players.player2.beys[i])}`;
        html += this.beyCollapsible(`edit_p2_${i}`, summary2);
      }
    } else {
      html += this.beyCollapsible('edit_p1', `${p1Name}: ${App.beyConfigToString(b.players.player1.bey)}`);
      html += this.beyCollapsible('edit_p2', `${p2Name}: ${App.beyConfigToString(b.players.player2.bey)}`);
    }
    html += `</div>`;

    return html;
  },

  // ラウンド編集行の描画
  renderRoundEditRow(idx, round, b) {
    const p1Name = b.players.player1.name;
    const p2Name = b.players.player2.name;
    const finishTypes = b.finishPoints || { spin: 1, burst: 2, over: 2, extreme: 3 };
    const is3on3 = b.battleFormat === '3on3';

    const finishOptions = Object.entries(DEFAULT_FINISH_POINTS).map(([k, v]) =>
      `<option value="${k}"${round.finishType === k ? ' selected' : ''}>${v.name} (+${finishTypes[k] || v.points})</option>`
    ).join('');

    let beyPairHtml = '';
    if (is3on3 && b.players.player1.beys) {
      // 3on3: ベイ対戦ペア選択
      const p1Beys = b.players.player1.beys;
      const p2Beys = b.players.player2.beys;

      // 同一サイクル内（3ラウンド単位）で使用済みのベイを収集
      const cycleStart = Math.floor(idx / 3) * 3;
      const cycleEnd = cycleStart + 3;
      const usedP1 = new Set();
      const usedP2 = new Set();
      (b.rounds || []).forEach((r, i) => {
        if (i === idx) return; // 自分自身は除外
        if (i < cycleStart || i >= cycleEnd) return; // 別サイクルは除外
        if (r.beyPairIndex !== undefined) {
          usedP1.add(r.beyPairIndex);
          usedP2.add(r.beyPairIndex);
        }
        if (r.beyPairP1 !== undefined) usedP1.add(r.beyPairP1);
        if (r.beyPairP2 !== undefined) usedP2.add(r.beyPairP2);
      });

      // 現在のベイペア値を取得
      let curP1 = '', curP2 = '';
      if (round.beyPairIndex !== undefined) {
        curP1 = String(round.beyPairIndex);
        curP2 = String(round.beyPairIndex);
      }
      if (round.beyPairP1 !== undefined) curP1 = String(round.beyPairP1);
      if (round.beyPairP2 !== undefined) curP2 = String(round.beyPairP2);

      const p1BeyOptions = p1Beys.map((bey, i) => {
        const isUsed = usedP1.has(i);
        const isCurrent = curP1 === String(i);
        return `<option value="${i}"${isCurrent ? ' selected' : ''}${isUsed && !isCurrent ? ' disabled' : ''}>Bey${i + 1}: ${this.beyToShortString(bey)}${isUsed && !isCurrent ? '（使用済）' : ''}</option>`;
      }).join('');
      const p2BeyOptions = p2Beys.map((bey, i) => {
        const isUsed = usedP2.has(i);
        const isCurrent = curP2 === String(i);
        return `<option value="${i}"${isCurrent ? ' selected' : ''}${isUsed && !isCurrent ? ' disabled' : ''}>Bey${i + 1}: ${this.beyToShortString(bey)}${isUsed && !isCurrent ? '（使用済）' : ''}</option>`;
      }).join('');

      beyPairHtml = `
        <div class="edit-round-bey-pair">
          <select class="edit-select edit-select-sm" onchange="View.onEditRoundChange(${idx}, 'beyP1', this.value)">
            ${p1BeyOptions}
          </select>
          <span class="edit-bey-vs">vs</span>
          <select class="edit-select edit-select-sm" onchange="View.onEditRoundChange(${idx}, 'beyP2', this.value)">
            ${p2BeyOptions}
          </select>
        </div>`;
    }

    return `<div class="edit-round-row" id="editRound_${idx}">
      <span class="round-number">R${idx + 1}</span>
      <select class="edit-select edit-select-sm" onchange="View.onEditRoundChange(${idx}, 'winner', this.value)">
        <option value="player1"${round.winner === 'player1' ? ' selected' : ''}>${p1Name}</option>
        <option value="player2"${round.winner === 'player2' ? ' selected' : ''}>${p2Name}</option>
      </select>
      <select class="edit-select edit-select-sm" onchange="View.onEditRoundChange(${idx}, 'finishType', this.value)">
        ${finishOptions}
      </select>
      <button class="btn btn-danger btn-sm" onclick="View.removeRound(${idx})">×</button>
    </div>${beyPairHtml}`;
  },

  // チーム戦の編集フォーム
  renderTeamEditForm(b) {
    let html = `<h3>チーム戦 - 編集中</h3>`;

    // スタジアム
    html += `
      <div class="modal-section">
        <div class="modal-label">スタジアム</div>
        <select id="editStadium" class="edit-select">
          ${Object.entries(STADIUMS).map(([k, v]) =>
            `<option value="${k}"${b.stadium === k ? ' selected' : ''}>${v}</option>`
          ).join('')}
        </select>
      </div>`;

    // 各マッチのラウンド編集
    (b.matches || []).forEach((m, mi) => {
      html += `
      <div class="modal-section">
        <div class="modal-label">マッチ${mi + 1}: ${m.playerA.name} vs ${m.playerB.name}</div>
        <div id="editMatchRounds_${mi}">`;

      (m.rounds || []).forEach((r, ri) => {
        html += this.renderTeamRoundEditRow(mi, ri, r, m.playerA.name, m.playerB.name);
      });

      html += `</div>
        <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="View.addTeamRound(${mi})">+ ラウンド追加</button>
      </div>`;
    });

    // マッチ追加ボタン
    html += `
      <div class="modal-section">
        <button class="btn btn-outline btn-sm" onclick="View.addTeamMatch()">+ マッチ追加</button>
      </div>`;

    // 各マッチの使用ベイ（折りたたみ式）
    html += `<div class="modal-section"><div class="modal-label">使用ベイ（タップで編集）</div>`;
    (b.matches || []).forEach((m, mi) => {
      html += this.beyCollapsible(`edit_m${mi}_a`, `M${mi + 1} ${m.playerA.name}: ${App.beyConfigToString(m.playerA.bey)}`);
      html += this.beyCollapsible(`edit_m${mi}_b`, `M${mi + 1} ${m.playerB.name}: ${App.beyConfigToString(m.playerB.bey)}`);
    });
    html += `</div>`;

    return html;
  },

  // チーム戦ラウンド編集行
  renderTeamRoundEditRow(matchIdx, roundIdx, round, pAName, pBName) {
    const finishOptions = Object.entries(DEFAULT_FINISH_POINTS).map(([k, v]) =>
      `<option value="${k}"${round.finishType === k ? ' selected' : ''}>${v.name} (+${v.points})</option>`
    ).join('');

    return `<div class="edit-round-row" id="editTeamRound_${matchIdx}_${roundIdx}">
      <span class="round-number">R${roundIdx + 1}</span>
      <select class="edit-select edit-select-sm" onchange="View.onEditTeamRoundChange(${matchIdx}, ${roundIdx}, 'winner', this.value)">
        <option value="a"${round.winner === 'a' ? ' selected' : ''}>${pAName}</option>
        <option value="b"${round.winner === 'b' ? ' selected' : ''}>${pBName}</option>
      </select>
      <select class="edit-select edit-select-sm" onchange="View.onEditTeamRoundChange(${matchIdx}, ${roundIdx}, 'finishType', this.value)">
        ${finishOptions}
      </select>
      <button class="btn btn-danger btn-sm" onclick="View.removeTeamRound(${matchIdx}, ${roundIdx})">×</button>
    </div>`;
  },

  // --- 個人戦 編集操作 ---

  onEditRoundChange(idx, field, value) {
    const round = this.editData.rounds[idx];
    if (!round) return;

    if (field === 'winner') {
      round.winner = value;
      round.winnerName = value === 'player1'
        ? this.editData.players.player1.name
        : this.editData.players.player2.name;
    } else if (field === 'finishType') {
      round.finishType = value;
      const fp = this.editData.finishPoints || {};
      round.points = fp[value] || DEFAULT_FINISH_POINTS[value].points;
    } else if (field === 'beyP1') {
      // 3on3: P1のベイ変更 → 自由選択形式で保存
      delete round.beyPairIndex;
      round.beyPairP1 = parseInt(value);
      if (round.beyPairP2 === undefined) round.beyPairP2 = 0;
      // 他ラウンドのベイ選択肢を更新するため再描画
      this.renderEditForm();
      return;
    } else if (field === 'beyP2') {
      delete round.beyPairIndex;
      round.beyPairP2 = parseInt(value);
      if (round.beyPairP1 === undefined) round.beyPairP1 = 0;
      this.renderEditForm();
      return;
    }

    this.updateScorePreview();
  },

  addRound() {
    const b = this.editData;
    const p1Name = b.players.player1.name;
    const is3on3 = b.battleFormat === '3on3';

    const newRound = {
      winner: 'player1',
      winnerName: p1Name,
      finishType: 'spin',
      points: (b.finishPoints && b.finishPoints.spin) || 1
    };

    // 3on3: ベイペア情報を付与（現サイクル内で未使用のベイを初期値に）
    if (is3on3 && b.players.player1.beys) {
      const newIdx = b.rounds.length; // 追加後のインデックス（まだpush前）
      const cycleStart = Math.floor(newIdx / 3) * 3;
      const usedP1 = new Set();
      const usedP2 = new Set();
      (b.rounds || []).forEach((r, i) => {
        if (i < cycleStart) return; // 別サイクルは無視
        if (r.beyPairIndex !== undefined) { usedP1.add(r.beyPairIndex); usedP2.add(r.beyPairIndex); }
        if (r.beyPairP1 !== undefined) usedP1.add(r.beyPairP1);
        if (r.beyPairP2 !== undefined) usedP2.add(r.beyPairP2);
      });
      const firstAvailP1 = [0, 1, 2].find(i => !usedP1.has(i));
      const firstAvailP2 = [0, 1, 2].find(i => !usedP2.has(i));
      if (firstAvailP1 === undefined || firstAvailP2 === undefined) {
        App.showToast('このサイクル内で全ベイが使用済みです。次サイクルが自動的に始まります', 'error');
        return;
      }
      newRound.beyPairP1 = firstAvailP1;
      newRound.beyPairP2 = firstAvailP2;
    }

    b.rounds.push(newRound);
    this.renderEditForm();
  },

  removeRound(idx) {
    this.editData.rounds.splice(idx, 1);
    this.renderEditForm();
  },

  // --- チーム戦 編集操作 ---

  onEditTeamRoundChange(matchIdx, roundIdx, field, value) {
    const match = this.editData.matches[matchIdx];
    if (!match) return;
    const round = match.rounds[roundIdx];
    if (!round) return;

    if (field === 'winner') {
      round.winner = value;
      round.winnerName = value === 'a' ? match.playerA.name : match.playerB.name;
    } else if (field === 'finishType') {
      round.finishType = value;
      round.points = DEFAULT_FINISH_POINTS[value].points;
    }
  },

  addTeamRound(matchIdx) {
    const match = this.editData.matches[matchIdx];
    if (!match) return;
    match.rounds.push({
      winner: 'a',
      winnerName: match.playerA.name,
      finishType: 'spin',
      points: 1
    });
    this.renderEditForm();
  },

  removeTeamRound(matchIdx, roundIdx) {
    const match = this.editData.matches[matchIdx];
    if (!match) return;
    match.rounds.splice(roundIdx, 1);
    this.renderEditForm();
  },

  addTeamMatch() {
    // チームAとBの残りメンバーから追加
    const existing = this.editData.matches || [];
    const usedA = existing.map(m => m.playerA.name);
    const usedB = existing.map(m => m.playerB.name);
    const availA = (this.editData.teamA || []).filter(n => !usedA.includes(n));
    const availB = (this.editData.teamB || []).filter(n => !usedB.includes(n));

    const pAName = availA[0] || this.editData.teamA[0];
    const pBName = availB[0] || this.editData.teamB[0];

    this.editData.matches.push({
      playerA: { name: pAName, bey: null },
      playerB: { name: pBName, bey: null },
      rounds: [{ winner: 'a', winnerName: pAName, finishType: 'spin', points: 1 }],
      scores: { a: 0, b: 0 },
      winner: pAName
    });
    this.renderEditForm();
  },

  // スコア計算（個人戦）
  calcScores(b) {
    const fp = b.finishPoints || {};
    let p1 = 0, p2 = 0;
    (b.rounds || []).forEach(r => {
      const pts = fp[r.finishType] || r.points || DEFAULT_FINISH_POINTS[r.finishType].points;
      if (r.winner === 'player1') p1 += pts;
      else p2 += pts;
    });
    const winner = p1 >= p2 ? b.players.player1.name : b.players.player2.name;
    return { p1, p2, winner };
  },

  // スコアプレビュー更新
  updateScorePreview() {
    const el = document.getElementById('editScorePreview');
    if (!el) return;
    const b = this.editData;
    const scores = this.calcScores(b);
    el.textContent = `${b.players.player1.name}: ${scores.p1} - ${b.players.player2.name}: ${scores.p2}　→ 勝者: ${scores.winner}`;
  },

  // 編集キャンセル
  cancelEdit() {
    this.editingBattle = null;
    this.editData = null;
    this.closeDetail();
  },

  // 編集保存
  saveEdit() {
    const b = this.editData;
    const id = this.editingBattle.id;

    // --- ベイ構成のバリデーション・収集 ---
    if (b.type === 'individual') {
      const is3on3 = b.battleFormat === '3on3';
      const p1Name = b.players.player1.name;
      const p2Name = b.players.player2.name;

      if (is3on3 && b.players.player1.beys) {
        const p1Beys = [];
        const p2Beys = [];
        for (let i = 0; i < 3; i++) {
          const err1 = App.validateBeyConfig(`edit_p1_${i}`);
          if (err1) { App.showToast(`${p1Name} Bey${i + 1}: ${err1}`, 'error'); return; }
          p1Beys.push(App.getBeyConfig(`edit_p1_${i}`));
          const err2 = App.validateBeyConfig(`edit_p2_${i}`);
          if (err2) { App.showToast(`${p2Name} Bey${i + 1}: ${err2}`, 'error'); return; }
          p2Beys.push(App.getBeyConfig(`edit_p2_${i}`));
        }
        const dupErr1 = App.validateBeyDuplicates(p1Beys);
        if (dupErr1) { App.showToast(`${p1Name}: ${dupErr1}`, 'error'); return; }
        const dupErr2 = App.validateBeyDuplicates(p2Beys);
        if (dupErr2) { App.showToast(`${p2Name}: ${dupErr2}`, 'error'); return; }
        b.players.player1.beys = p1Beys;
        b.players.player2.beys = p2Beys;
      } else {
        const err1 = App.validateBeyConfig('edit_p1');
        if (err1) { App.showToast(`${p1Name}: ${err1}`, 'error'); return; }
        const err2 = App.validateBeyConfig('edit_p2');
        if (err2) { App.showToast(`${p2Name}: ${err2}`, 'error'); return; }
        b.players.player1.bey = App.getBeyConfig('edit_p1');
        b.players.player2.bey = App.getBeyConfig('edit_p2');
      }
    } else {
      // チーム戦: 各マッチのベイ収集とチーム内重複チェック
      const teamABeyMap = {};
      const teamBBeyMap = {};
      for (let mi = 0; mi < (b.matches || []).length; mi++) {
        const m = b.matches[mi];
        const errA = App.validateBeyConfig(`edit_m${mi}_a`);
        if (errA) { App.showToast(`マッチ${mi + 1} ${m.playerA.name}: ${errA}`, 'error'); return; }
        const errB = App.validateBeyConfig(`edit_m${mi}_b`);
        if (errB) { App.showToast(`マッチ${mi + 1} ${m.playerB.name}: ${errB}`, 'error'); return; }
        m.playerA.bey = App.getBeyConfig(`edit_m${mi}_a`);
        m.playerB.bey = App.getBeyConfig(`edit_m${mi}_b`);
        // チームごとに1プレイヤー1ベイで収集（重複チェック用）
        if (!teamABeyMap[m.playerA.name]) teamABeyMap[m.playerA.name] = m.playerA.bey;
        if (!teamBBeyMap[m.playerB.name]) teamBBeyMap[m.playerB.name] = m.playerB.bey;
      }
      const teamABeys = Object.values(teamABeyMap);
      const teamBBeys = Object.values(teamBBeyMap);
      if (teamABeys.length > 1) {
        const dupA = App.validateBeyDuplicates(teamABeys);
        if (dupA) { App.showToast(`チームA: ${dupA}`, 'error'); return; }
      }
      if (teamBBeys.length > 1) {
        const dupB = App.validateBeyDuplicates(teamBBeys);
        if (dupB) { App.showToast(`チームB: ${dupB}`, 'error'); return; }
      }
    }

    // 3on3: サイクル内ベイ重複チェック（3ラウンドごとにリセット）
    if (b.type === 'individual' && b.battleFormat === '3on3' && b.players.player1.beys) {
      let usedP1 = [];
      let usedP2 = [];
      for (let i = 0; i < (b.rounds || []).length; i++) {
        // 3ラウンドごとにサイクルリセット
        if (i > 0 && i % 3 === 0) { usedP1 = []; usedP2 = []; }
        const r = b.rounds[i];
        const p1Idx = r.beyPairP1 !== undefined ? r.beyPairP1 : r.beyPairIndex;
        const p2Idx = r.beyPairP2 !== undefined ? r.beyPairP2 : r.beyPairIndex;
        if (p1Idx !== undefined && usedP1.includes(p1Idx)) {
          const cycle = Math.floor(i / 3) + 1;
          App.showToast(`サイクル${cycle} R${i + 1}: P1のBey${p1Idx + 1}が同サイクル内で重複しています`, 'error');
          return;
        }
        if (p2Idx !== undefined && usedP2.includes(p2Idx)) {
          const cycle = Math.floor(i / 3) + 1;
          App.showToast(`サイクル${cycle} R${i + 1}: P2のBey${p2Idx + 1}が同サイクル内で重複しています`, 'error');
          return;
        }
        if (p1Idx !== undefined) usedP1.push(p1Idx);
        if (p2Idx !== undefined) usedP2.push(p2Idx);
      }
    }

    // スタジアム更新
    b.stadium = document.getElementById('editStadium').value;

    if (b.type === 'individual') {
      // スコア再計算
      const scores = this.calcScores(b);
      b.finalScore = { player1: scores.p1, player2: scores.p2 };
      b.winner = scores.winner;
    } else {
      // チーム戦: 各マッチのスコア・勝者を再計算
      let teamAWins = 0, teamBWins = 0;
      (b.matches || []).forEach(m => {
        let a = 0, bScore = 0;
        (m.rounds || []).forEach(r => {
          const pts = r.points || DEFAULT_FINISH_POINTS[r.finishType].points;
          if (r.winner === 'a') a += pts;
          else bScore += pts;
        });
        m.scores = { a, b: bScore };
        m.winner = a >= bScore ? m.playerA.name : m.playerB.name;
        if (b.teamA.includes(m.winner)) teamAWins++;
        else teamBWins++;
      });
      b.winnerTeam = teamAWins >= teamBWins ? 'A' : 'B';
    }

    // idフィールドを除去してFirebaseに保存
    const saveData = { ...b };
    delete saveData.id;

    database.ref('battles/' + id).set(saveData)
      .then(() => {
        App.showToast('戦績を更新しました');
        this.editingBattle = null;
        this.editData = null;
        this.closeDetail();
      })
      .catch(err => {
        App.showToast('更新に失敗しました: ' + err.message, 'error');
      });
  },

  // 戦績削除
  deleteBattle(id) {
    if (!confirm('この戦績を削除しますか？')) return;
    database.ref('battles/' + id).remove()
      .then(() => App.showToast('戦績を削除しました'))
      .catch(err => App.showToast('削除に失敗しました: ' + err.message, 'error'));
  }
};

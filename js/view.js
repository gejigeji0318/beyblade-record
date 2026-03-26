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

    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.remove('hidden');
  },

  // 詳細モーダル閉じる
  closeDetail() {
    document.getElementById('modalOverlay').classList.add('hidden');
  },

  // 戦績削除
  deleteBattle(id) {
    if (!confirm('この戦績を削除しますか？')) return;
    database.ref('battles/' + id).remove()
      .then(() => App.showToast('戦績を削除しました'))
      .catch(err => App.showToast('削除に失敗しました: ' + err.message, 'error'));
  }
};

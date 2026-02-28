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
      blade = `${config.lockChip || ''} ${config.mainBlade || ''} ${config.assistBlade || ''}`.trim();
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

    tbody.innerHTML = battles.map(b => {
      const date = new Date(b.timestamp);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      const stadium = STADIUMS[b.stadium] || b.stadium;
      const typeName = b.type === 'individual' ? '個人戦' : 'チーム戦';

      let matchup, score, winner, beyMatchup;

      if (b.type === 'individual') {
        matchup = `${b.players.player1.name}<br>vs<br>${b.players.player2.name}`;
        score = `${b.finalScore.player1} - ${b.finalScore.player2}`;
        winner = b.winner;
        const bey1 = this.beyToShortString(b.players.player1.bey);
        const bey2 = this.beyToShortString(b.players.player2.bey);
        beyMatchup = `${bey1}<br>vs<br>${bey2}`;
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

      return `<tr>
        <td><span class="badge ${b.type === 'individual' ? 'badge-attack' : 'badge-stamina'}">${typeName}</span></td>
        <td style="font-size:0.8rem;">${stadium}</td>
        <td style="font-size:0.8rem;">${beyMatchup}</td>
        <td>${matchup}</td>
        <td>${score}</td>
        <td><span class="badge badge-win">${winner}</span></td>
        <td>${dateStr}</td>
        <td><button class="btn btn-danger btn-sm" onclick="View.deleteBattle('${b.id}')">削除</button></td>
      </tr>`;
    }).join('');
  },

  // 戦績削除
  deleteBattle(id) {
    if (!confirm('この戦績を削除しますか？')) return;
    database.ref('battles/' + id).remove()
      .then(() => App.showToast('戦績を削除しました'))
      .catch(err => App.showToast('削除に失敗しました: ' + err.message, 'error'));
  }
};

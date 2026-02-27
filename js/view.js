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

    return this.battles.filter(b => {
      if (typeFilter !== 'all' && b.type !== typeFilter) return false;
      if (stadiumFilter !== 'all' && b.stadium !== stadiumFilter) return false;
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

      let matchup, score, winner;

      if (b.type === 'individual') {
        matchup = `${b.players.player1.name} vs ${b.players.player2.name}`;
        score = `${b.finalScore.player1} - ${b.finalScore.player2}`;
        winner = b.winner;
      } else {
        matchup = `${b.teamA.join(',')} vs ${b.teamB.join(',')}`;
        const winsA = b.matches.filter(m => b.teamA.includes(m.winner)).length;
        const winsB = b.matches.filter(m => b.teamB.includes(m.winner)).length;
        score = `${winsA} - ${winsB}`;
        winner = `チーム${b.winnerTeam}`;
      }

      return `<tr>
        <td>${dateStr}</td>
        <td style="font-size:0.8rem;">${stadium}</td>
        <td><span class="badge ${b.type === 'individual' ? 'badge-attack' : 'badge-stamina'}">${typeName}</span></td>
        <td>${matchup}</td>
        <td>${score}</td>
        <td><span class="badge badge-win">${winner}</span></td>
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

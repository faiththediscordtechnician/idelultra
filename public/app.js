import GameEngine from './gameEngine.js';
import HospitalRenderer from './hospitalRenderer.js';

class GameUI {
  constructor() {
    this.game = new GameEngine();
    this.renderer = new HospitalRenderer(
      document.getElementById('gameContainer'),
      this.game
    );

    this.setupEventListeners();
    this.startUILoop();

    window.gameUI = this;
  }

  setupEventListeners() {
    this.game.on('staffHired', (data) => {
      this.notify(`${this.game.staffTiers[data.tier].name} hired! 👥`);
      this.updateUI();
    });

    this.game.on('roomBought', () => {
      this.notify('Room purchased! 🏗️');
      this.updateUI();
    });

    this.game.on('roomUpgraded', () => {
      this.notify('Room upgraded! ⚡');
      this.updateUI();
    });

    this.game.on('treatmentCompleted', (data) => {
      this.notify(`Treated ${data.patient.name}! +$${data.patient.revenue}`);
      this.updateUI();
    });
  }

  updateUI() {
    // Stats
    document.getElementById('moneyDisplay').textContent = '$' + this.game.formatMoney(this.game.money);
    document.getElementById('rateDisplay').textContent = '+$' + this.game.formatMoney(this.game.moneyPerSecond) + '/s';
    document.getElementById('reputationDisplay').textContent = Math.floor(this.game.reputation);
    document.getElementById('prestigeDisplay').textContent = this.game.totalPrestige;

    // Hospital
    document.getElementById('hospitalName').textContent = '🏥 Community Clinic';
    document.getElementById('multiplierDisplay').textContent = '×1.0';

    // Queues
    document.getElementById('queueCountDisplay').textContent = this.game.patientQueue.length;
    document.getElementById('checkinCountDisplay').textContent = this.game.checkingInPatients.length;
    document.getElementById('treatingCountDisplay').textContent = this.game.activeTreatments.length;
  }

  showRoomDetail(roomIdx) {
    const room = this.game.rooms[roomIdx];
    if (!room) return;

    const panel = document.getElementById('roomDetailPanel');
    const title = document.getElementById('roomDetailTitle');
    const content = document.getElementById('roomDetailContent');

    title.textContent = `${room.icon} ${room.name}`;

    let html = `
      <div class="panel-section">
        <div class="stat">
          <span class="stat-label">Level:</span>
          <span class="stat-value">${room.level}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Owned:</span>
          <span class="stat-value">${room.owned}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Monthly Income:</span>
          <span class="stat-value">~$${Math.floor(10 * room.owned * room.level)}</span>
        </div>
      </div>

      <div class="panel-section">
        <div style="margin-bottom: 8px; font-weight: bold; color: #64d9ff;">⬆️ Upgrades</div>
        <button class="btn" onclick="gameUI.upgradeRoom(${roomIdx})">
          Upgrade Level ($${Math.floor(room.baseCost * Math.pow(room.costMult, room.owned) * 0.5)})
        </button>
        <button class="btn" onclick="gameUI.buyRoom(${roomIdx})">
          Buy Another ($${Math.floor(room.baseCost * Math.pow(room.costMult, room.owned))})
        </button>
      </div>

      <div class="panel-section">
        <div style="margin-bottom: 8px; font-weight: bold; color: #64d9ff;">👥 Staff</div>
        <div style="font-size: 10px; color: #999; margin-bottom: 8px;">
          Auto-assigned to this room
        </div>
      </div>
    `;

    content.innerHTML = html;
    panel.style.display = 'block';
  }

  closeRoomDetail() {
    document.getElementById('roomDetailPanel').style.display = 'none';
  }

  showReception() {
    const panel = document.getElementById('receptionPanel');
    const content = document.getElementById('receptionContent');

    let html = `
      <div class="panel-section">
        <div class="stat">
          <span class="stat-label">Receptionists:</span>
          <span class="stat-value">0</span>
        </div>
      </div>

      <div class="panel-section">
        <div style="margin-bottom: 8px; font-weight: bold; color: #64d9ff;">👨‍💼 Hire Staff</div>
    `;

    // List staff hiring options
    Object.entries(this.game.staffTiers).forEach(([tier, tierData]) => {
      const staffCount = this.game.staffByTier[tier].length;
      const canAfford = this.game.money >= tierData.cost;

      html += `
        <div style="margin-bottom: 6px;">
          <div style="font-size: 11px; color: #b0c4de; margin-bottom: 2px;">
            ${tierData.icon} ${tierData.name} (${staffCount}) - $${tierData.cost}
          </div>
          <button class="btn" onclick="gameUI.hireStaff('${tier}')" ${canAfford ? '' : 'disabled'}>
            Hire ($${tierData.cost})
          </button>
        </div>
      `;
    });

    html += `
      </div>
    `;

    content.innerHTML = html;
    panel.style.display = 'block';
  }

  closeReception() {
    document.getElementById('receptionPanel').style.display = 'none';
  }

  buyRoom(roomIdx) {
    if (this.game.buyRoom(roomIdx)) {
      this.updateUI();
      this.showRoomDetail(roomIdx);
      this.notify('Room purchased! 🏗️');
    }
  }

  upgradeRoom(roomIdx) {
    if (this.game.upgradeRoom(roomIdx)) {
      this.updateUI();
      this.showRoomDetail(roomIdx);
      this.notify('Room upgraded! ⚡');
    }
  }

  hireStaff(tier) {
    if (this.game.hireStaff(tier)) {
      this.updateUI();
      this.showReception();
      this.notify(`${this.game.staffTiers[tier].name} hired! 👥`);
    }
  }

  notify(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  startUILoop() {
    setInterval(() => {
      this.updateUI();
    }, 100);
  }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.gameUI = new GameUI();
  });
} else {
  window.gameUI = new GameUI();
}

export default GameUI;

import GameEngine from './gameEngine.js';
import { HospitalRenderer } from './hospitalRenderer.js';

class GameUI {
  constructor() {
    this.game = new GameEngine();
    this.setupContainer();
    this.renderer = new HospitalRenderer(
      document.getElementById('hospital-canvas'),
      this.game
    );
    this.setupUI();
    this.attachEventListeners();
    this.updateUI();
    this.startUILoop();
  }

  setupContainer() {
    const root = document.getElementById('root');
    root.innerHTML = `
      <div class="game-container">
        <div id="hospital-canvas" class="viewport"></div>

        <button id="statsToggleBtn" class="stats-toggle-btn" title="Toggle stats panels">📊</button>

        <div class="hud" id="hud">
          <!-- Top Stats Panel -->
          <div class="panel stats-panel">
            <div class="stat-item">
              <div class="stat-label">💰 Money</div>
              <div class="stat-value" id="moneyDisplay">$0</div>
              <div class="stat-rate" id="mpsDisplay">+$0/s</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">⭐ Reputation</div>
              <div class="stat-value" id="repDisplay">0</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">✨ Prestige</div>
              <div class="stat-value" id="prestigeDisplay">0</div>
            </div>
          </div>

          <!-- Hospital Info Panel -->
          <div class="panel hospital-panel">
            <div class="hospital-name" id="hospitalName">Community Clinic</div>
            <div class="hospital-multiplier" id="multiplierDisplay">×1.0 income</div>
          </div>

          <!-- Left Panel: Patients & Rooms -->
          <div class="panel left-panel">
            <div class="panel-title">🏥 Rooms & Operations</div>
            <div id="roomsContainer" class="rooms-grid"></div>
          </div>

          <!-- Right Panel: Staff -->
          <div class="panel right-panel">
            <div class="panel-title">👥 Staff</div>
            <div id="staffContainer" class="staff-grid"></div>
          </div>

          <!-- Bottom Panel: Patient Queue -->
          <div class="panel patient-panel">
            <div class="panel-title">Queue <span id="queueCount">(0)</span> &nbsp; <span id="treatingCount" class="treating-count">Treating: 0</span></div>
            <div id="patientQueue" class="patient-list"></div>
            <button id="serveBtn" class="btn btn-primary">
              <span class="btn-text">Serve Patient</span>
              <span class="btn-icon">💊</span>
            </button>
          </div>

          <!-- Prestige Panel -->
          <div class="panel prestige-panel">
            <div class="prestige-info">
              <div class="prestige-gain" id="prestigeGainDisplay">+0 prestige</div>
              <button id="prestigeBtn" class="btn btn-prestige">
                <span class="btn-text">Prestige Reset</span>
                <span class="btn-icon">✨</span>
              </button>
            </div>
          </div>

          <!-- Notification Container -->
          <div id="notifications" class="notifications"></div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html, body {
        width: 100%;
        height: 100%;
        font-family: 'Segoe UI', 'Trebuchet MS', sans-serif;
        background: #0a0e17;
        overflow: hidden;
      }

      #root {
        width: 100%;
        height: 100%;
      }

      .game-container {
        width: 100%;
        height: 100%;
        display: flex;
        position: relative;
      }

      .viewport {
        flex: 1;
        overflow: hidden;
      }

      .hud {
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .panel {
        position: absolute;
        background: rgba(15, 20, 35, 0.85);
        border: 2px solid rgba(100, 150, 255, 0.3);
        border-radius: 12px;
        padding: 16px;
        font-size: 14px;
        color: #e0e0e0;
        backdrop-filter: blur(10px);
        pointer-events: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      .hud.hud-collapsed .panel {
        opacity: 0;
        transform: translateY(12px);
        pointer-events: none;
        visibility: hidden;
      }

      .stats-toggle-btn {
        position: absolute;
        top: 16px;
        left: 16px;
        z-index: 50;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid rgba(100, 150, 255, 0.5);
        background: rgba(15, 20, 35, 0.85);
        color: #64d9ff;
        font-size: 22px;
        cursor: pointer;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        pointer-events: auto;
        transition: transform 0.15s ease, background 0.15s ease;
      }

      .stats-toggle-btn:hover {
        transform: scale(1.08);
        background: rgba(100, 150, 255, 0.25);
      }

      .treating-count {
        color: #ffb74d;
        font-size: 13px;
        font-weight: normal;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .panel-title {
        font-weight: bold;
        margin-bottom: 12px;
        font-size: 16px;
        color: #64d9ff;
      }

      /* Stats Panel */
      .stats-panel {
        top: 16px;
        left: 16px;
        width: 300px;
        display: flex;
        gap: 16px;
      }

      .stat-item {
        flex: 1;
        background: rgba(100, 150, 255, 0.1);
        padding: 12px;
        border-radius: 8px;
        border-left: 3px solid #64d9ff;
      }

      .stat-label {
        font-size: 12px;
        color: #999;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #64d9ff;
      }

      .stat-rate {
        font-size: 12px;
        color: #4a9;
        margin-top: 4px;
      }

      /* Hospital Panel */
      .hospital-panel {
        top: 16px;
        right: 16px;
        width: 250px;
      }

      .hospital-name {
        font-size: 20px;
        font-weight: bold;
        color: #64d9ff;
        margin-bottom: 8px;
      }

      .hospital-multiplier {
        color: #4a9;
        font-size: 14px;
      }

      /* Left Panel: Rooms */
      .left-panel {
        left: 16px;
        top: 150px;
        width: 350px;
        max-height: 500px;
        overflow-y: auto;
      }

      .rooms-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .room-card {
        background: rgba(100, 150, 255, 0.05);
        border: 1px solid rgba(100, 150, 255, 0.2);
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .room-card:hover {
        background: rgba(100, 150, 255, 0.15);
        border-color: rgba(100, 150, 255, 0.5);
        transform: translateY(-2px);
      }

      .room-card.selected {
        background: rgba(100, 150, 255, 0.2);
        border-color: #64d9ff;
        box-shadow: 0 0 16px rgba(100, 217, 255, 0.3);
      }

      .room-details {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        padding: 0 0 0 0;
      }

      .room-card.selected .room-details {
        max-height: 500px;
        padding: 12px 0 0 0;
        border-top: 1px solid rgba(100, 150, 255, 0.15);
        margin-top: 8px;
      }

      .room-name {
        font-weight: bold;
        color: #64d9ff;
        margin-bottom: 6px;
        font-size: 13px;
      }

      .room-stats {
        font-size: 12px;
        color: #999;
        line-height: 1.4;
      }

      .room-cost {
        color: #f09;
        margin-top: 6px;
        font-weight: bold;
      }

      .equip-list {
        margin-top: 10px;
        border-top: 1px solid rgba(100, 150, 255, 0.15);
        padding-top: 8px;
      }

      .equip-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        font-size: 11px;
      }

      .equip-name {
        color: #b0c4de;
        flex: 1;
      }

      .btn-equip {
        padding: 4px 8px;
        font-size: 11px;
        border-radius: 6px;
        border: 1px solid rgba(100, 217, 255, 0.4);
        background: rgba(100, 217, 255, 0.12);
        color: #64d9ff;
        cursor: pointer;
        white-space: nowrap;
      }

      .btn-equip:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .btn-equip.owned {
        background: rgba(76, 175, 80, 0.15);
        border-color: rgba(76, 175, 80, 0.5);
        color: #81c784;
      }

      /* Right Panel: Staff */
      .right-panel {
        right: 16px;
        top: 150px;
        width: 350px;
        max-height: 500px;
        overflow-y: auto;
      }

      .staff-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .staff-card {
        background: rgba(100, 150, 255, 0.05);
        border: 1px solid rgba(100, 150, 255, 0.2);
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .staff-card:hover {
        background: rgba(100, 150, 255, 0.15);
        border-color: rgba(100, 150, 255, 0.5);
        transform: translateX(4px);
      }

      .staff-name {
        font-weight: bold;
        color: #64d9ff;
        margin-bottom: 6px;
      }

      .staff-count {
        font-size: 12px;
        color: #999;
        margin-bottom: 8px;
      }

      .staff-cost {
        color: #f09;
        font-weight: bold;
      }

      /* Patient Panel */
      .patient-panel {
        left: 16px;
        bottom: 16px;
        width: 350px;
        max-height: 300px;
      }

      .patient-list {
        max-height: 180px;
        overflow-y: auto;
        margin-bottom: 12px;
      }

      .patient-item {
        background: rgba(100, 150, 255, 0.1);
        padding: 8px;
        border-radius: 6px;
        margin-bottom: 6px;
        font-size: 13px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: slideIn 0.3s ease-out;
      }

      .patient-name {
        color: #64d9ff;
      }

      .patient-reward {
        color: #4a9;
      }

      /* Prestige Panel */
      .prestige-panel {
        right: 16px;
        bottom: 16px;
        width: 250px;
      }

      .prestige-info {
        text-align: center;
      }

      .prestige-gain {
        color: #f4a;
        font-weight: bold;
        margin-bottom: 12px;
        font-size: 16px;
      }

      /* Buttons */
      .btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 14px;
        pointer-events: auto;
      }

      .btn-text {
        flex: 1;
        text-align: left;
      }

      .btn-icon {
        font-size: 18px;
      }

      .btn-primary {
        background: linear-gradient(135deg, #64d9ff, #4a9);
        color: #000;
        border: 2px solid #64d9ff;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(100, 217, 255, 0.3);
      }

      .btn-primary:active {
        transform: translateY(0);
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-prestige {
        background: linear-gradient(135deg, #f4a, #f84);
        color: #fff;
        border: 2px solid #f4a;
      }

      .btn-prestige:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(255, 68, 170, 0.3);
      }

      .btn-prestige:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Notifications */
      .notifications {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        pointer-events: auto;
      }

      .notification {
        background: rgba(15, 20, 35, 0.95);
        border: 2px solid #64d9ff;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        color: #64d9ff;
        animation: notificationSlideIn 0.3s ease-out;
        max-width: 300px;
        backdrop-filter: blur(10px);
      }

      .notification.success {
        border-color: #4a9;
        color: #4a9;
      }

      .notification.achievement {
        border-color: #f4a;
        color: #f4a;
      }

      @keyframes notificationSlideIn {
        from {
          opacity: 0;
          transform: translateX(300px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes notificationSlideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(300px);
        }
      }

      /* Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
      }

      ::-webkit-scrollbar-track {
        background: rgba(100, 150, 255, 0.05);
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(100, 150, 255, 0.3);
        border-radius: 3px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(100, 150, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }

  setupUI() {
    // Rooms
    const roomsContainer = document.getElementById('roomsContainer');
    this.selectedRoomIdx = null;

    this.game.rooms.forEach((room, idx) => {
      const card = document.createElement('div');
      card.className = 'room-card';
      card.id = `room-card-${idx}`;
      card.innerHTML = `
        <div class="room-name">${room.icon} ${room.name}</div>
        <div class="room-stats">
          <div>Owned: <strong id="room-owned-${idx}">0</strong></div>
          <div>Level: <strong id="room-level-${idx}">1</strong></div>
          <div>Output: <strong id="room-output-${idx}">0</strong>/s</div>
        </div>
        <div class="room-details">
          <div class="room-cost">
            <button class="btn btn-primary" style="margin-top: 8px; padding: 8px;" onclick="gameUI.buyRoom(${idx})">Buy ($<span id="room-cost-${idx}">0</span>)</button>
            <button class="btn" style="margin-top: 6px; padding: 8px; background: rgba(100, 150, 255, 0.1); border: 1px solid rgba(100, 150, 255, 0.2); color: #64d9ff;" onclick="gameUI.upgradeRoom(${idx})">Upgrade ($<span id="room-upgrade-${idx}">0</span>)</button>
          </div>
          <div class="equip-list">
            ${this.game.getFurnitureCatalog(idx).map((item) => `
              <div class="equip-item">
                <span class="equip-name">${item.icon} ${item.name} (+${Math.round(item.bonus * 100)}%)</span>
                <button class="btn-equip" id="equip-btn-${idx}-${item.id}" onclick="gameUI.buyFurniture(${idx}, '${item.id}')">Buy ($${item.cost})</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        this.selectRoom(idx);
      });

      roomsContainer.appendChild(card);
    });

    // Staff
    const staffContainer = document.getElementById('staffContainer');
    const tiers = ['intern', 'resident', 'attending', 'specialist'];
    tiers.forEach((tier) => {
      const tierData = this.game.staffTiers[tier];
      const card = document.createElement('div');
      card.className = 'staff-card';
      card.innerHTML = `
        <div class="staff-name">${tierData.name}</div>
        <div class="staff-count">Hired: <strong id="staff-count-${tier}">0</strong></div>
        <div class="staff-cost">
          <button class="btn btn-primary" style="padding: 8px;" onclick="gameUI.hireStaff('${tier}')">Hire ($<span id="staff-cost-${tier}">1000</span>)</button>
        </div>
      `;
      staffContainer.appendChild(card);
    });

    // Patient Queue
    document.getElementById('serveBtn').addEventListener('click', () => this.servePatient());

    // Prestige button
    document.getElementById('prestigeBtn').addEventListener('click', () => this.prestige());

    // Stats panel toggle
    document.getElementById('statsToggleBtn').addEventListener('click', () => this.toggleHud());
    document.getElementById('hud').classList.add('hud-collapsed');

    // Connect game events
    this.game.on('staffHired', () => this.showNotification('Staff hired! 👥', 'success'));
    this.game.on('roomBought', () => this.showNotification('Room purchased! 🏗️', 'success'));
    this.game.on('roomUpgraded', () => this.showNotification('Room upgraded! ⚡', 'success'));
    this.game.on('missionCompleted', (mission) => this.showNotification(`Achievement: ${mission.name}! 🏆`, 'achievement'));
    this.game.on('patientTypeUnlocked', (pt) => this.showNotification(`Unlocked: ${pt.icon} ${pt.name}`, 'success'));
    this.game.on('treatmentCompleted', ({ patient }) => this.showNotification(`Treated ${patient.icon} ${patient.name} +$${patient.revenuePerPatient}`, 'success'));
  }

  toggleHud() {
    document.getElementById('hud').classList.toggle('hud-collapsed');
  }

  selectRoom(idx) {
    if (this.selectedRoomIdx === idx) {
      this.selectedRoomIdx = null;
    } else {
      this.selectedRoomIdx = idx;
    }

    document.querySelectorAll('.room-card').forEach((card, i) => {
      if (i === this.selectedRoomIdx) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  attachEventListeners() {
    window.gameUI = this;
  }

  buyRoom(idx) {
    if (this.game.buyRoom(idx)) {
      this.updateUI();
    }
  }

  upgradeRoom(idx) {
    if (this.game.upgradeRoom(idx)) {
      this.updateUI();
    }
  }

  buyFurniture(roomIdx, itemId) {
    if (this.game.buyFurniture(roomIdx, itemId)) {
      this.showNotification('Equipment installed! 🛠️', 'success');
      this.updateUI();
    }
  }

  hireStaff(tier) {
    if (this.game.hireStaff(tier)) {
      this.updateUI();
    }
  }

  servePatient() {
    if (this.game.treatPatient()) {
      this.updateUI();
    }
  }

  prestige() {
    const gain = this.game.prestige();
    if (gain > 0) {
      this.showNotification(`Prestiged! +${gain} Prestige ✨`, 'achievement');
      this.updateUI();
    }
  }

  updateUI() {
    // Stats
    document.getElementById('moneyDisplay').textContent = this.formatMoney(this.game.money);
    document.getElementById('mpsDisplay').textContent = `+${this.formatMoney(this.game.moneyPerSecond)}/s`;
    document.getElementById('repDisplay').textContent = this.formatMoney(this.game.reputation);
    document.getElementById('prestigeDisplay').textContent = this.game.totalPrestige;

    // Hospital
    const hospital = this.game.hospitals[this.game.currentHospital];
    document.getElementById('hospitalName').textContent = hospital.name;
    document.getElementById('multiplierDisplay').textContent = `×${hospital.incomeMultiplier} income`;

    // Rooms
    this.game.rooms.forEach((room, idx) => {
      document.getElementById(`room-owned-${idx}`).textContent = room.owned;
      document.getElementById(`room-level-${idx}`).textContent = room.level;
      document.getElementById(`room-output-${idx}`).textContent = Math.floor(this.game.getRoomProduction(room));
      document.getElementById(`room-cost-${idx}`).textContent = Math.floor(this.game.getRoomCost(room));
      document.getElementById(`room-upgrade-${idx}`).textContent = Math.floor(this.game.getRoomCost(room) * 0.5);

      this.game.getFurnitureCatalog(idx).forEach((item) => {
        const btn = document.getElementById(`equip-btn-${idx}-${item.id}`);
        if (!btn) return;
        const owned = this.game.ownsFurniture(idx, item.id);
        if (owned) {
          btn.textContent = 'Owned ✓';
          btn.disabled = true;
          btn.classList.add('owned');
        } else {
          btn.textContent = `Buy ($${item.cost})`;
          btn.disabled = this.game.money < item.cost;
          btn.classList.remove('owned');
        }
      });
    });

    // Staff
    const tiers = ['intern', 'resident', 'attending', 'specialist'];
    tiers.forEach((tier) => {
      const count = this.game.staffByTier[tier].length;
      document.getElementById(`staff-count-${tier}`).textContent = count;
      document.getElementById(`staff-cost-${tier}`).textContent = this.game.getStaffCost(tier);
    });

    // Patient Queue (only rebuild the DOM when the visible set of patients actually changes,
    // otherwise the slideIn animation replays every tick and looks like nonstop motion)
    const visibleQueue = this.game.patientQueue.slice(0, 6);
    const queueKey = visibleQueue.map((p) => p.id).join(',');
    if (queueKey !== this.lastQueueKey) {
      this.lastQueueKey = queueKey;
      const queueContainer = document.getElementById('patientQueue');
      queueContainer.innerHTML = '';
      visibleQueue.forEach((patient) => {
        const item = document.createElement('div');
        item.className = 'patient-item';
        item.innerHTML = `
          <span class="patient-name">${patient.icon} ${patient.name}</span>
          <span class="patient-reward">+$${patient.revenuePerPatient}</span>
        `;
        queueContainer.appendChild(item);
      });
    }
    document.getElementById('queueCount').textContent = `(${this.game.patientQueue.length})`;
    document.getElementById('treatingCount').textContent = `Treating: ${this.game.activeTreatments.length}`;

    // Serve button is only enabled when there's a waiting patient AND an idle staff member
    document.getElementById('serveBtn').disabled = !this.game.canTreatPatient();

    // Prestige
    const prestigeGain = this.game.getPrestigeGain();
    document.getElementById('prestigeGainDisplay').textContent = `+${prestigeGain} prestige`;
    document.getElementById('prestigeBtn').disabled = prestigeGain === 0;
  }

  startUILoop() {
    setInterval(() => this.updateUI(), 100);
  }

  formatMoney(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
  }

  showNotification(text, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = text;
    container.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'notificationSlideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.gameUI = new GameUI();
  });
} else {
  window.gameUI = new GameUI();
}

import GameEngine from './gameEngine.js';

class GameUI {
  constructor() {
    this.game = new GameEngine();
    this.setupUI();
    this.renderLoop();
  }

  setupUI() {
    const root = document.getElementById('root');
    root.innerHTML = `
      <div class="notification-container" id="notificationContainer"></div>
      <div class="game-container">
        <div class="header">
          <h1>🏥 Idle Hospital</h1>
          <div class="header-stats">
            <div class="stat">
              <div class="stat-label">Money</div>
              <div class="stat-value" id="money">$0</div>
            </div>
            <div class="stat">
              <div class="stat-label">Per Second</div>
              <div class="stat-value" id="mps">$0/s</div>
            </div>
            <div class="stat">
              <div class="stat-label">Prestige</div>
              <div class="stat-value" id="prestige">0</div>
            </div>
            <div class="stat">
              <div class="stat-label">Hospital</div>
              <div class="stat-value" id="hospital">Community Clinic</div>
            </div>
          </div>
        </div>

        <div class="main-content">
          <div class="left-panel">
            <div class="section">
              <h2>👥 Staff</h2>
              <div class="staff-section">
                <div class="staff-item">
                  <div class="staff-info">
                    <div class="staff-name">Doctors</div>
                    <div class="staff-count" id="doctorCount">0</div>
                  </div>
                  <button id="buyDoctorBtn" class="btn btn-primary" id="doctorCostBtn">Hire Doctor</button>
                </div>
                <div class="staff-item">
                  <div class="staff-info">
                    <div class="staff-name">Nurses</div>
                    <div class="staff-count" id="nurseCount">0</div>
                  </div>
                  <button id="buyNurseBtn" class="btn btn-primary" id="nurseCostBtn">Hire Nurse</button>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>🏢 Rooms & Infrastructure</h2>
              <div id="roomsContainer" class="rooms-grid"></div>
            </div>
          </div>

          <div class="right-panel">
            <div class="section">
              <h2>🌟 Patient Types</h2>
              <div id="patientTypesContainer" class="patient-types-list"></div>
            </div>

            <div class="section">
              <h2>🏛️ Hospital Upgrades</h2>
              <div id="hospitalsContainer" class="hospitals-list"></div>
            </div>

            <div class="section prestige-section">
              <h2>✨ Prestige</h2>
              <p id="prestigeInfo">Gain prestige based on your wealth and reset to gain bonuses.</p>
              <button id="prestigeBtn" class="btn btn-prestige">Prestige (0 points)</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
    this.attachEventListeners();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .game-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #0f1419;
        color: #e0e6ed;
        font-size: 14px;
        overflow: hidden;
      }

      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-bottom: 2px solid #764ba2;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      }

      .header h1 {
        margin: 0 0 15px 0;
        font-size: 32px;
        color: white;
      }

      .header-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
      }

      .stat {
        background: rgba(255, 255, 255, 0.1);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .stat-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        margin-bottom: 5px;
      }

      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: white;
      }

      .main-content {
        display: flex;
        flex: 1;
        gap: 20px;
        padding: 20px;
        overflow: hidden;
      }

      .left-panel, .right-panel {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .section {
        background: #1a1f26;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #2d3748;
      }

      .section h2 {
        margin: 0 0 15px 0;
        font-size: 18px;
        color: #667eea;
        border-bottom: 2px solid #667eea;
        padding-bottom: 10px;
      }

      .staff-section {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .staff-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0f1419;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #2d3748;
      }

      .staff-info {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .staff-name {
        font-weight: bold;
        font-size: 14px;
      }

      .staff-count {
        font-size: 20px;
        font-weight: bold;
        color: #667eea;
      }

      .btn {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .btn-primary {
        background: #667eea;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #5568d3;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .btn-primary:disabled {
        background: #4a5c99;
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: #2d3748;
        color: #e0e6ed;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #3d4758;
      }

      .btn-prestige {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        width: 100%;
        padding: 12px;
        font-size: 14px;
      }

      .btn-prestige:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(245, 87, 108, 0.4);
      }

      .rooms-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .room-card {
        background: #0f1419;
        border: 1px solid #2d3748;
        border-radius: 8px;
        padding: 12px;
        transition: all 0.2s ease;
      }

      .room-card:hover {
        border-color: #667eea;
        background: #151a22;
      }

      .room-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .room-name {
        font-weight: bold;
        font-size: 13px;
      }

      .room-icon {
        font-size: 18px;
      }

      .room-stats {
        font-size: 12px;
        color: #a0aec0;
        margin-bottom: 8px;
        line-height: 1.5;
      }

      .room-buttons {
        display: flex;
        gap: 6px;
      }

      .room-buttons .btn {
        flex: 1;
        padding: 6px;
        font-size: 11px;
      }

      .patient-types-list, .hospitals-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .patient-type-item, .hospital-item {
        background: #0f1419;
        border: 1px solid #2d3748;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .patient-type-item.locked, .hospital-item.locked {
        opacity: 0.5;
        border-color: #4a5c99;
      }

      .patient-type-item.unlocked {
        border-left: 3px solid #48bb78;
      }

      .patient-type-info {
        flex: 1;
      }

      .patient-type-name, .hospital-name {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .patient-type-revenue, .hospital-bonus {
        font-size: 12px;
        color: #a0aec0;
      }

      .prestige-section {
        margin-top: auto;
      }

      .prestige-section p {
        font-size: 12px;
        color: #a0aec0;
        margin-bottom: 12px;
      }

      .progress-bar {
        width: 100%;
        height: 6px;
        background: #0f1419;
        border-radius: 3px;
        overflow: hidden;
        margin-top: 4px;
        border: 1px solid #2d3748;
      }

      .progress-bar.small {
        height: 4px;
        margin-top: 2px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transition: width 0.3s ease;
      }

      .hospital-requirements {
        font-size: 11px;
        color: #a0aec0;
        margin-top: 6px;
      }

      .hospital-requirements div {
        margin-bottom: 4px;
      }

      .notification-container {
        position: fixed;
        top: 100px;
        right: 20px;
        pointer-events: none;
        z-index: 1000;
      }

      .notification {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease, slideOut 0.3s ease 2.7s;
        font-size: 13px;
        font-weight: 600;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }

      @media (max-width: 1400px) {
        .header-stats {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 1024px) {
        .main-content {
          flex-direction: column;
        }

        .rooms-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 768px) {
        .rooms-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .header-stats {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      /* Scrollbar styling */
      .left-panel::-webkit-scrollbar,
      .right-panel::-webkit-scrollbar {
        width: 8px;
      }

      .left-panel::-webkit-scrollbar-track,
      .right-panel::-webkit-scrollbar-track {
        background: #1a1f26;
      }

      .left-panel::-webkit-scrollbar-thumb,
      .right-panel::-webkit-scrollbar-thumb {
        background: #667eea;
        border-radius: 4px;
      }

      .left-panel::-webkit-scrollbar-thumb:hover,
      .right-panel::-webkit-scrollbar-thumb:hover {
        background: #764ba2;
      }
    `;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    document.getElementById('buyDoctorBtn').addEventListener('click', () => {
      this.game.buyDoctor();
    });

    document.getElementById('buyNurseBtn').addEventListener('click', () => {
      this.game.buyNurse();
    });

    document.getElementById('prestigeBtn').addEventListener('click', () => {
      if (this.game.totalPrestige + Math.floor(Math.sqrt(this.game.money)) > this.game.totalPrestige) {
        this.game.prestige();
      }
    });

    this.game.rooms.forEach((room, index) => {
      // Will be attached in render
    });
  }

  formatMoney(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return Math.floor(num).toString();
  }

  renderRooms() {
    const container = document.getElementById('roomsContainer');
    container.innerHTML = this.game.rooms
      .map(
        (room, index) => `
      <div class="room-card">
        <div class="room-header">
          <div class="room-name">${room.icon} ${room.name}</div>
        </div>
        <div class="room-stats">
          <div>Owned: <strong>${room.owned}</strong></div>
          <div>Level: <strong>${room.level}</strong></div>
          <div>Production: <strong>${this.formatMoney(this.game.getRoomProduction(room))}/s</strong></div>
          <div>Buy Cost: <strong>$${this.formatMoney(this.game.getRoomCost(room))}</strong></div>
        </div>
        <div class="room-buttons">
          <button class="btn btn-primary room-buy-btn" data-room-id="${index}"
            ${this.game.money < this.game.getRoomCost(room) ? 'disabled' : ''}>
            Buy
          </button>
          ${room.owned > 0
            ? `<button class="btn btn-secondary room-upgrade-btn" data-room-id="${index}"
              ${this.game.money < this.game.getRoomCost(room) * 0.5 ? 'disabled' : ''}>
              Upgrade
            </button>`
            : ''}
        </div>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('.room-buy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.game.buyRoom(parseInt(btn.dataset.roomId));
      });
    });

    container.querySelectorAll('.room-upgrade-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.game.upgradeRoom(parseInt(btn.dataset.roomId));
      });
    });
  }

  renderPatientTypes() {
    const container = document.getElementById('patientTypesContainer');
    container.innerHTML = this.game.patientTypes
      .map(
        (pt) => {
          const progress = Math.min(100, (this.game.totalPrestige / pt.prestigeRequired) * 100);
          return `
      <div class="patient-type-item ${pt.unlocked ? 'unlocked' : 'locked'}">
        <div class="patient-type-info">
          <div class="patient-type-name">${pt.icon} ${pt.name}</div>
          <div class="patient-type-revenue">$${this.formatMoney(pt.revenuePerPatient)} per patient</div>
          ${!pt.unlocked ? `
            <div class="patient-type-revenue">
              Requires ${pt.prestigeRequired} prestige (${this.game.totalPrestige}/${pt.prestigeRequired})
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
        }
      )
      .join('');
  }

  renderHospitals() {
    const container = document.getElementById('hospitalsContainer');
    container.innerHTML = this.game.hospitals
      .map(
        (hospital, index) => {
          const prestigeProgress = hospital.prestige > 0 ? Math.min(100, (this.game.totalPrestige / hospital.prestige) * 100) : 100;
          const moneyProgress = Math.min(100, (this.game.money / hospital.cost) * 100);
          return `
      <div class="hospital-item ${hospital.unlocked ? '' : 'locked'}">
        <div class="patient-type-info">
          <div class="hospital-name">${hospital.name}</div>
          <div class="hospital-bonus">
            ${hospital.unlocked
              ? `✓ ${hospital.incomeMultiplier}x income`
              : `${hospital.incomeMultiplier}x income`}
          </div>
          ${!hospital.unlocked ? `
            <div class="hospital-requirements">
              ${hospital.prestige > 0 ? `
                <div>Prestige: ${this.game.totalPrestige}/${hospital.prestige}</div>
                <div class="progress-bar small">
                  <div class="progress-fill" style="width: ${prestigeProgress}%"></div>
                </div>
              ` : ''}
              <div>Money: $${this.formatMoney(this.game.money)}/$${this.formatMoney(hospital.cost)}</div>
              <div class="progress-bar small">
                <div class="progress-fill" style="width: ${moneyProgress}%"></div>
              </div>
            </div>
          ` : ''}
        </div>
        ${!hospital.unlocked && this.game.currentHospital !== hospital.id
          ? `<button class="btn btn-primary hospital-upgrade-btn" data-hospital-id="${index}"
            ${this.game.money < hospital.cost || (hospital.prestige > 0 && this.game.totalPrestige < hospital.prestige) ? 'disabled' : ''}>
            Unlock
          </button>`
          : ''}
        ${this.game.currentHospital === index ? '<div style="color: #48bb78; font-weight: bold; font-size: 12px;">✓ ACTIVE</div>' : ''}
      </div>
    `;
        }
      )
      .join('');

    container.querySelectorAll('.hospital-upgrade-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.game.upgradeHospital(parseInt(btn.dataset.hospitalId));
      });
    });
  }

  renderStats() {
    document.getElementById('money').textContent = '$' + this.formatMoney(this.game.money);
    document.getElementById('mps').textContent = '$' + this.formatMoney(this.game.moneyPerSecond) + '/s';
    document.getElementById('prestige').textContent = this.game.totalPrestige.toString();
    document.getElementById('hospital').textContent = this.game.hospitals[this.game.currentHospital].name;
    document.getElementById('doctorCount').textContent = this.game.doctors.length;
    document.getElementById('nurseCount').textContent = this.game.nurses.length;

    const doctorCost = this.game.getDoctorCost();
    const nurseCost = this.game.getNurseCost();

    const doctorBtn = document.getElementById('buyDoctorBtn');
    const nurseBtn = document.getElementById('buyNurseBtn');

    doctorBtn.textContent = `Hire Doctor - $${this.formatMoney(doctorCost)}`;
    nurseBtn.textContent = `Hire Nurse - $${this.formatMoney(nurseCost)}`;

    doctorBtn.disabled = this.game.money < doctorCost;
    nurseBtn.disabled = this.game.money < nurseCost;

    const prestigeGain = Math.floor(Math.sqrt(this.game.money));
    document.getElementById('prestigeBtn').textContent = `Prestige (${prestigeGain} points)`;
    document.getElementById('prestigeInfo').textContent = `Gain ${prestigeGain} prestige based on your wealth and reset to gain bonuses.`;
  }

  renderNotifications() {
    const container = document.getElementById('notificationContainer');
    if (this.game.unlockedNotifications && this.game.unlockedNotifications.length > 0) {
      const now = Date.now();
      const activeNotifications = this.game.unlockedNotifications.filter((n) => now - n.time < 3000);
      this.game.unlockedNotifications = activeNotifications;

      container.innerHTML = activeNotifications
        .map((n) => `<div class="notification">${n.text}</div>`)
        .join('');
    }
  }

  renderLoop() {
    this.renderStats();
    this.renderRooms();
    this.renderPatientTypes();
    this.renderHospitals();
    this.renderNotifications();
    requestAnimationFrame(() => this.renderLoop());
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GameUI();
  });
} else {
  new GameUI();
}

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
    this.renderLoop();
  }

  setupContainer() {
    const root = document.getElementById('root');
    root.innerHTML = `
      <div class="game-layout">
        <div id="hospital-canvas" class="hospital-view"></div>

        <div class="hud-overlay">
          <!-- Top Left: Stats -->
          <div class="hud-panel top-left">
            <div class="stat-group">
              <div class="stat-label">💰 Money</div>
              <div class="stat-value" id="money">$0</div>
            </div>
            <div class="stat-group">
              <div class="stat-label">⭐ Reputation</div>
              <div class="stat-value" id="reputation">0</div>
            </div>
            <div class="stat-group">
              <div class="stat-label">📊 /sec</div>
              <div class="stat-value" id="mps">$0</div>
            </div>
          </div>

          <!-- Top Right: Hospital Info -->
          <div class="hud-panel top-right">
            <div class="hospital-info">
              <h3 id="hospital-name">Community Clinic</h3>
              <div class="hospital-status">
                <span class="badge">Prestige: <strong id="prestige">0</strong></span>
              </div>
            </div>
          </div>

          <!-- Bottom Left: Patient Queue -->
          <div class="hud-panel bottom-left">
            <h3>👥 Patient Queue</h3>
            <div class="patient-queue" id="patientQueue">
              <div class="empty">No patients</div>
            </div>
            <button id="servePatientBtn" class="btn btn-primary">
              Serve Patient
            </button>
          </div>

          <!-- Bottom Right: Quick Actions -->
          <div class="hud-panel bottom-right">
            <div class="action-tabs">
              <button class="tab-btn active" data-tab="staff">👥 Staff</button>
              <button class="tab-btn" data-tab="missions">📋 Missions</button>
              <button class="tab-btn" data-tab="prestige">✨ Prestige</button>
            </div>
            <div class="tab-content" id="staffTab">
              <!-- Staff panel content -->
            </div>
            <div class="tab-content hidden" id="missionsTab">
              <!-- Missions panel content -->
            </div>
            <div class="tab-content hidden" id="prestigeTab">
              <!-- Prestige panel content -->
            </div>
          </div>

          <!-- Center Bottom: Controls Info -->
          <div class="hud-center-bottom">
            <span class="tip">🖱️ Drag to move camera | Click rooms to interact</span>
          </div>
        </div>

        <!-- Notifications -->
        <div id="notificationContainer" class="notification-container"></div>
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

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #0a0e17;
        color: #e0e6ed;
        overflow: hidden;
      }

      .game-layout {
        width: 100vw;
        height: 100vh;
        position: relative;
        overflow: hidden;
      }

      .hospital-view {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
      }

      .hud-overlay {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        pointer-events: none;
      }

      .hud-overlay > * {
        pointer-events: auto;
      }

      .hud-panel {
        position: absolute;
        background: rgba(26, 31, 46, 0.95);
        border: 1px solid #667eea;
        border-radius: 8px;
        padding: 16px;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
      }

      .hud-panel h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #667eea;
        text-transform: uppercase;
      }

      .top-left {
        top: 20px;
        left: 20px;
        min-width: 200px;
      }

      .top-right {
        top: 20px;
        right: 20px;
        min-width: 250px;
      }

      .bottom-left {
        bottom: 100px;
        left: 20px;
        width: 280px;
        max-height: 300px;
        overflow-y: auto;
      }

      .bottom-right {
        bottom: 20px;
        right: 20px;
        width: 320px;
        max-height: 400px;
        overflow-y: auto;
      }

      .hud-center-bottom {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(102, 126, 234, 0.2);
        border: 1px solid #667eea;
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 12px;
        color: #a0aec0;
      }

      .stat-group {
        margin-bottom: 12px;
      }

      .stat-label {
        font-size: 11px;
        color: #a0aec0;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #4caf50;
      }

      .hospital-info {
        text-align: right;
      }

      .hospital-info h3 {
        text-align: right;
        color: #667eea;
      }

      .badge {
        display: inline-block;
        background: rgba(102, 126, 234, 0.2);
        border: 1px solid #667eea;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        margin-top: 4px;
      }

      .patient-queue {
        background: #0a0e17;
        border-radius: 6px;
        padding: 8px;
        margin-bottom: 8px;
        max-height: 150px;
        overflow-y: auto;
      }

      .patient-item {
        background: #2d3748;
        padding: 6px 8px;
        border-radius: 4px;
        margin-bottom: 6px;
        font-size: 12px;
        display: flex;
        justify-content: space-between;
      }

      .patient-reward {
        color: #4caf50;
        font-weight: bold;
      }

      .empty {
        color: #a0aec0;
        text-align: center;
        padding: 20px 0;
        font-size: 12px;
      }

      .btn {
        width: 100%;
        padding: 10px 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.2s ease;
        background: #667eea;
        color: white;
      }

      .btn:hover:not(:disabled) {
        background: #5568d3;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .btn:disabled {
        background: #4a5c99;
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: #4caf50;
      }

      .btn-primary:hover:not(:disabled) {
        background: #45a049;
      }

      .action-tabs {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6px;
        margin-bottom: 12px;
      }

      .tab-btn {
        padding: 6px 8px;
        background: #2d3748;
        border: 1px solid #667eea;
        border-radius: 4px;
        color: #a0aec0;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        transition: all 0.2s ease;
      }

      .tab-btn.active {
        background: #667eea;
        color: white;
      }

      .tab-btn:hover {
        background: #3d4758;
      }

      .tab-content {
        display: block;
        background: #0a0e17;
        border-radius: 6px;
        padding: 8px;
        font-size: 12px;
      }

      .tab-content.hidden {
        display: none;
      }

      .staff-card {
        background: #2d3748;
        border-left: 3px solid #667eea;
        padding: 8px;
        margin-bottom: 6px;
        border-radius: 4px;
      }

      .staff-card.intern {
        border-left-color: #90caf9;
      }

      .staff-card.resident {
        border-left-color: #81c784;
      }

      .staff-card.attending {
        border-left-color: #ffb74d;
      }

      .staff-card.specialist {
        border-left-color: #f06292;
      }

      .staff-card-name {
        font-weight: bold;
        margin-bottom: 2px;
      }

      .staff-card-info {
        font-size: 11px;
        color: #a0aec0;
      }

      .staff-hire-btn {
        width: 100%;
        padding: 6px;
        margin-top: 6px;
        font-size: 11px;
      }

      .mission-item {
        background: #2d3748;
        border-left: 3px solid #667eea;
        padding: 8px;
        margin-bottom: 6px;
        border-radius: 4px;
      }

      .mission-item.completed {
        border-left-color: #4caf50;
        background: rgba(76, 175, 80, 0.1);
      }

      .mission-name {
        font-weight: bold;
        margin-bottom: 4px;
        font-size: 12px;
      }

      .mission-progress {
        background: #1a1f2e;
        height: 4px;
        border-radius: 2px;
        overflow: hidden;
        margin: 4px 0;
      }

      .mission-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transition: width 0.3s ease;
      }

      .prestige-info {
        background: #2d3748;
        border-left: 3px solid #f093fb;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 12px;
        font-size: 12px;
      }

      .prestige-gain {
        font-weight: bold;
        color: #f093fb;
        margin: 8px 0;
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        animation: slideIn 0.3s ease, slideOut 0.3s ease 2.7s;
        font-size: 12px;
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

      /* Scrollbars */
      .bottom-left::-webkit-scrollbar,
      .bottom-right::-webkit-scrollbar {
        width: 6px;
      }

      .bottom-left::-webkit-scrollbar-track,
      .bottom-right::-webkit-scrollbar-track {
        background: #1a1f2e;
      }

      .bottom-left::-webkit-scrollbar-thumb,
      .bottom-right::-webkit-scrollbar-thumb {
        background: #667eea;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  setupUI() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((t) => t.classList.add('hidden'));
        e.target.classList.add('active');
        const tabId = e.target.dataset.tab + 'Tab';
        document.getElementById(tabId).classList.remove('hidden');
      });
    });

    // Serve patient button
    document.getElementById('servePatientBtn').addEventListener('click', () => {
      this.servePatient();
    });
  }

  attachEventListeners() {}

  servePatient() {
    const patient = this.game.servePatient();
    if (patient) {
      this.showNotification(`Served ${patient.name} +$${patient.revenuePerPatient}`);
    }
  }

  showNotification(text) {
    const container = document.getElementById('notificationContainer');
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = text;
    container.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  formatMoney(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return Math.floor(num).toString();
  }

  renderStats() {
    document.getElementById('money').textContent = '$' + this.formatMoney(this.game.money);
    document.getElementById('reputation').textContent = this.game.reputation;
    document.getElementById('mps').textContent = '$' + this.formatMoney(this.game.moneyPerSecond);
    document.getElementById('prestige').textContent = this.game.totalPrestige;
    document.getElementById('hospital-name').textContent = this.game.hospitals[this.game.currentHospital].name;
    document.getElementById('servePatientBtn').disabled = this.game.patientQueue.length === 0;
  }

  renderPatientQueue() {
    const container = document.getElementById('patientQueue');
    if (this.game.patientQueue.length === 0) {
      container.innerHTML = '<div class="empty">No patients waiting</div>';
    } else {
      container.innerHTML = this.game.patientQueue
        .slice(0, 5)
        .map(
          (p) =>
            `<div class="patient-item">
              <span>${p.icon} ${p.name}</span>
              <span class="patient-reward">+$${p.revenuePerPatient}</span>
            </div>`
        )
        .join('');
    }
  }

  renderStaffTab() {
    const container = document.getElementById('staffTab');
    let html = '';

    Object.entries(this.game.staffTiers).forEach(([tier, tierData]) => {
      const count = this.game.staffByTier[tier].length;
      const cost = this.game.getStaffCost(tier);
      const canAfford = this.game.money >= cost && (tier === 'intern' || this.game.reputation >= tierData.reputationCost);

      html += `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: bold; color: #667eea; margin-bottom: 8px;">${tierData.name} (${count})</div>
          <button class="staff-hire-btn" data-tier="${tier}" ${!canAfford ? 'disabled' : ''} style="width: 100%; padding: 6px; font-size: 11px;">
            Hire: $${this.formatMoney(cost)}
          </button>
        </div>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.staff-hire-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.game.hireStaff(btn.dataset.tier);
      });
    });
  }

  renderMissionsTab() {
    const container = document.getElementById('missionsTab');
    container.innerHTML = this.game.missions
      .map((m) => {
        const progress = Math.min(100, (m.current / m.target) * 100);
        return `
        <div class="mission-item ${m.completed ? 'completed' : ''}">
          <div class="mission-name">${m.completed ? '✓ ' : ''}${m.name}</div>
          <div class="mission-progress">
            <div class="mission-progress-bar" style="width: ${progress}%"></div>
          </div>
          <div style="font-size: 10px; color: #a0aec0;">${m.current}/${m.target}</div>
        </div>
      `;
      })
      .join('');
  }

  renderPrestigeTab() {
    const container = document.getElementById('prestigeTab');
    const gain = this.game.getPrestigeGain();
    const multiplier = this.game.getPrestigeMultiplier();

    container.innerHTML = `
      <div class="prestige-info">
        <div style="color: #a0aec0;">Prestige Multiplier</div>
        <div class="prestige-gain">${((multiplier - 1) * 100).toFixed(0)}% Bonus</div>
        <div style="font-size: 11px; color: #a0aec0; margin: 8px 0;">
          Current prestige points: <strong>${this.game.totalPrestige}</strong>
        </div>
      </div>
      <button class="btn btn-primary" id="prestigeBtn" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
        Prestige (${gain} points)
      </button>
    `;

    document.getElementById('prestigeBtn').addEventListener('click', () => {
      this.game.prestige();
      this.showNotification(`Prestige! +${gain} points`);
    });
  }

  renderLoop() {
    this.renderStats();
    this.renderPatientQueue();
    this.renderStaffTab();
    this.renderMissionsTab();
    this.renderPrestigeTab();
    requestAnimationFrame(() => this.renderLoop());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GameUI();
  });
} else {
  new GameUI();
}

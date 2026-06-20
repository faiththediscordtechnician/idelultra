class GameEngine {
  constructor() {
    this.time = 0;
    this.deltaTime = 0;
    this.lastFrameTime = Date.now();

    // Resources
    this.money = 5000;
    this.reputation = 0;
    this.totalPrestige = 0;
    this.moneyPerSecond = 0;
    this.currentHospital = 0;
    this.patientsServed = 0;

    // Patient types with colors
    this.patientTypes = [
      { id: 0, name: 'Checkup', icon: '🏥', revenue: 50, reputation: 1, prestigeReq: 0, color: 0x4CAF50, weight: 0.4, unlocked: true },
      { id: 1, name: 'Emergency', icon: '🚑', revenue: 250, reputation: 5, prestigeReq: 2, color: 0xFF6B6B, weight: 0.2, unlocked: false },
      { id: 2, name: 'Surgery', icon: '🔪', revenue: 800, reputation: 20, prestigeReq: 8, color: 0xFF9800, weight: 0.15, unlocked: false },
      { id: 3, name: 'ICU', icon: '💊', revenue: 1500, reputation: 30, prestigeReq: 15, color: 0xF44336, weight: 0.1, unlocked: false },
      { id: 4, name: 'Maternity', icon: '👶', revenue: 1200, reputation: 25, prestigeReq: 10, color: 0xE91E63, weight: 0.15, unlocked: false },
    ];

    // Staff tiers with colors
    this.staffTiers = {
      intern: { name: 'Intern', icon: '👤', cost: 1000, salary: 50, efficiency: 1, color: 0x90caf9, unlocked: true },
      resident: { name: 'Resident', icon: '👨‍⚕️', cost: 3500, salary: 150, efficiency: 2.5, color: 0x81c784, unlocked: false },
      attending: { name: 'Attending', icon: '👨‍⚕️', cost: 12000, salary: 400, efficiency: 6, color: 0xffb74d, unlocked: false },
      specialist: { name: 'Specialist', icon: '👨‍⚕️', cost: 40000, salary: 1000, efficiency: 15, color: 0xf06292, unlocked: false },
    };

    this.staffByTier = {
      intern: [],
      resident: [],
      attending: [],
      specialist: [],
    };

    // Room types with colors
    this.roomTypes = [
      { id: 0, name: 'Reception', icon: '🪑', type: 'reception', baseCost: 50, costMult: 1.12, color: 0x4CAF50 },
      { id: 1, name: 'Examination', icon: '🔬', type: 'examination', baseCost: 800, costMult: 1.13, color: 0x2196F3 },
      { id: 2, name: 'Surgery', icon: '⚕️', type: 'surgery', baseCost: 5000, costMult: 1.14, color: 0xFF6B6B },
      { id: 3, name: 'ICU', icon: '🏨', type: 'icu', baseCost: 15000, costMult: 1.14, color: 0xFF9800 },
      { id: 4, name: 'Pharmacy', icon: '💉', type: 'pharmacy', baseCost: 2000, costMult: 1.13, color: 0x9C27B0 },
      { id: 5, name: 'Lab', icon: '🧪', type: 'lab', baseCost: 8000, costMult: 1.14, color: 0x00BCD4 },
    ];

    this.rooms = this.roomTypes.map(rt => ({
      ...rt,
      owned: rt.type === 'reception' ? 1 : 0,
      level: 1,
      unlocked: rt.type === 'reception',
    }));

    // Patient queues
    this.patientQueue = [];
    this.checkingInPatients = [];
    this.activeTreatments = [];

    // Events system
    this.listeners = {};

    // Load and start
    this.loadGame();
    this.startGameLoop();
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  generatePatient() {
    const available = this.patientTypes.filter(p => p.unlocked);
    if (available.length === 0) return null;

    const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const pType of available) {
      rand -= pType.weight;
      if (rand <= 0) {
        return {
          ...pType,
          id: Math.random(),
          state: 'waiting_checkin',
          checkInTime: 0,
          waitTime: 0,
          mood: 1.0,
        };
      }
    }
    return null;
  }

  addPatientToQueue() {
    const patient = this.generatePatient();
    if (patient) {
      this.patientQueue.push(patient);
      this.emit('patientAdded', patient);
    }
  }

  hireStaff(tier) {
    const tierData = this.staffTiers[tier];
    if (this.money >= tierData.cost) {
      this.money -= tierData.cost;
      this.staffByTier[tier].push({
        id: Math.random(),
        tier,
        busy: false,
      });
      this.updateMoneyPerSecond();
      this.emit('staffHired', { tier });
      return true;
    }
    return false;
  }

  buyRoom(roomIdx) {
    const room = this.rooms[roomIdx];
    const cost = room.baseCost * Math.pow(room.costMult, room.owned);

    if (this.money >= cost) {
      this.money -= cost;
      room.owned += 1;
      this.updateMoneyPerSecond();
      this.emit('roomBought', { roomIdx });
      return true;
    }
    return false;
  }

  upgradeRoom(roomIdx) {
    const room = this.rooms[roomIdx];
    if (room.owned === 0) return false;

    const cost = (room.baseCost * Math.pow(room.costMult, room.owned)) * 0.5;
    if (this.money >= cost) {
      this.money -= cost;
      room.level += 1;
      this.updateMoneyPerSecond();
      this.emit('roomUpgraded', { roomIdx });
      return true;
    }
    return false;
  }

  getIdleStaff() {
    const idle = [];
    Object.values(this.staffByTier).forEach(list => {
      list.forEach(s => { if (!s.busy) idle.push(s); });
    });
    return idle;
  }

  assignNextPatient() {
    if (this.patientQueue.length === 0) return false;
    const idle = this.getIdleStaff();
    if (idle.length === 0) return false;

    const staff = idle[0];
    const patient = this.patientQueue.shift();
    patient.state = 'in_treatment';
    staff.busy = true;

    const roomIdx = Math.floor(Math.random() * this.rooms.length);
    const duration = 3 + Math.random() * 2;

    this.activeTreatments.push({
      id: Math.random(),
      patient,
      staff,
      roomIdx,
      remaining: duration,
    });

    this.emit('treatmentStarted', { patient, staff, roomIdx });
    return true;
  }

  updateTreatments(dt) {
    for (let i = this.activeTreatments.length - 1; i >= 0; i--) {
      const t = this.activeTreatments[i];
      t.remaining -= dt;

      if (t.remaining <= 0) {
        this.money += t.patient.revenue;
        this.reputation += t.patient.reputation;
        this.patientsServed += 1;
        t.staff.busy = false;
        this.emit('treatmentCompleted', { patient: t.patient });
        this.activeTreatments.splice(i, 1);
      }
    }
  }

  updateMoneyPerSecond() {
    let mps = this.rooms.reduce((sum, room) => {
      if (room.owned > 0) {
        return sum + (10 * room.owned * room.level);
      }
      return sum;
    }, 0);

    Object.entries(this.staffByTier).forEach(([tier, staff]) => {
      mps += staff.length * (this.staffTiers[tier].efficiency * 2);
    });

    this.moneyPerSecond = mps;
  }

  startGameLoop() {
    this.patientSpawnTimer = 0;
    this.patientSpawnInterval = 2.5;
    this.saveTimer = 0;

    setInterval(() => {
      const now = Date.now();
      this.deltaTime = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.time += this.deltaTime;

      // Accumulate money
      this.money += this.moneyPerSecond * this.deltaTime;

      // Update treatments
      this.updateTreatments(this.deltaTime);

      // Assign patients to staff
      while (this.assignNextPatient());

      // Spawn patients
      this.patientSpawnTimer += this.deltaTime;
      if (this.patientSpawnTimer >= this.patientSpawnInterval && this.patientQueue.length < 20) {
        this.patientSpawnTimer = 0;
        this.addPatientToQueue();
      }

      // Auto-save
      this.saveTimer += this.deltaTime;
      if (this.saveTimer >= 5) {
        this.saveTimer = 0;
        this.saveGame();
      }
    }, 16);
  }

  saveGame() {
    const data = {
      money: this.money,
      reputation: this.reputation,
      totalPrestige: this.totalPrestige,
      patientsServed: this.patientsServed,
      staffByTier: this.staffByTier,
      rooms: this.rooms,
    };
    localStorage.setItem('hospitalGameSave', JSON.stringify(data));
  }

  loadGame() {
    const saved = localStorage.getItem('hospitalGameSave');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.money = data.money || 5000;
        this.reputation = data.reputation || 0;
        this.totalPrestige = data.totalPrestige || 0;
        this.patientsServed = data.patientsServed || 0;
        this.staffByTier = data.staffByTier || this.staffByTier;
        if (data.rooms) {
          this.rooms = data.rooms.map((r, i) => ({ ...this.roomTypes[i], ...r }));
        }
        this.updateMoneyPerSecond();
      } catch (e) {
        console.error('Failed to load save:', e);
      }
    }
  }

  formatMoney(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
  }
}

export default GameEngine;

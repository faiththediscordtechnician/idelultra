// Professional Game Engine with proper state management
class GameEngine {
  constructor() {
    this.time = 0;
    this.deltaTime = 0;
    this.lastFrameTime = Date.now();

    // Core resources
    this.money = 5000;
    this.reputation = 0;
    this.moneyPerSecond = 0;
    this.currentHospital = 0;
    this.totalPrestige = 0;

    // Staff system
    this.staffByTier = {
      intern: [],
      resident: [],
      attending: [],
      specialist: [],
    };

    this.staffTiers = {
      intern: { name: 'Intern', salary: 50, efficiency: 1, costMultiplier: 1.1, reputationCost: 0, baseHireCost: 1000, color: 0x90caf9 },
      resident: { name: 'Resident', salary: 150, efficiency: 2.5, costMultiplier: 1.15, reputationCost: 10, baseHireCost: 3500, color: 0x81c784 },
      attending: { name: 'Attending', salary: 400, efficiency: 6, costMultiplier: 1.2, reputationCost: 50, baseHireCost: 12000, color: 0xffb74d },
      specialist: { name: 'Specialist', salary: 1000, efficiency: 15, costMultiplier: 1.25, reputationCost: 200, baseHireCost: 40000, color: 0xf06292 },
    };

    // Rooms
    this.rooms = [];
    this.roomTypes = [
      { id: 0, name: 'Reception', type: 'reception', baseCost: 50, costMultiplier: 1.12, baseProduction: 3, productionMultiplier: 1.15, icon: '🪑', staffCapacity: 5, color: 0x4CAF50 },
      { id: 1, name: 'Examination Room', type: 'examination', baseCost: 800, costMultiplier: 1.13, baseProduction: 25, productionMultiplier: 1.18, icon: '🔬', staffCapacity: 3, color: 0x2196F3 },
      { id: 2, name: 'Surgery Suite', type: 'surgery', baseCost: 5000, costMultiplier: 1.14, baseProduction: 80, productionMultiplier: 1.2, icon: '⚕️', staffCapacity: 4, color: 0xFF6B6B },
      { id: 3, name: 'ICU Ward', type: 'icu', baseCost: 15000, costMultiplier: 1.14, baseProduction: 200, productionMultiplier: 1.22, icon: '🏨', staffCapacity: 6, color: 0xFF9800 },
      { id: 4, name: 'Pharmacy', type: 'pharmacy', baseCost: 2000, costMultiplier: 1.13, baseProduction: 40, productionMultiplier: 1.17, icon: '💉', staffCapacity: 2, color: 0x9C27B0 },
      { id: 5, name: 'Lab', type: 'lab', baseCost: 8000, costMultiplier: 1.14, baseProduction: 100, productionMultiplier: 1.2, icon: '🧪', staffCapacity: 3, color: 0x00BCD4 },
    ];

    this.rooms = this.roomTypes.map(rt => ({
      ...rt,
      owned: rt.type === 'reception' ? 1 : 0,
      level: 1,
      furniture: [],
      unlocked: rt.type === 'reception',
      unlockedAt: rt.type === 'reception' ? 0 : -1,
    }));

    // Room unlock requirements — must hit ALL to unlock
    // Treatment times scale: examination (1x), pharmacy (1.2x), lab (1.5x), surgery (2x), icu (2.5x)
    this.roomUnlocks = {
      reception: { prestige: 0, money: 0, reputation: 0, patients: 0 },
      pharmacy: { prestige: 0, money: 2500, reputation: 80, patients: 30 },
      examination: { prestige: 0, money: 5000, reputation: 150, patients: 60 },
      lab: { prestige: 1, money: 20000, reputation: 400, patients: 150 },
      surgery: { prestige: 3, money: 100000, reputation: 1500, patients: 400 },
      icu: { prestige: 8, money: 500000, reputation: 5000, patients: 1200 },
    };

    // Purchasable furniture/equipment per room type — each owned item multiplies
    // that room's production, and pops into place visually once bought.
    this.furnitureCatalog = {
      reception: [
        { id: 'recChairs', name: 'Comfy Chairs', icon: '🪑', cost: 300, bonus: 0.10 },
        { id: 'recTV', name: 'TV Screen', icon: '📺', cost: 600, bonus: 0.15 },
        { id: 'recDesk', name: 'Welcome Desk Upgrade', icon: '🛎️', cost: 1200, bonus: 0.20 },
      ],
      examination: [
        { id: 'examMonitor', name: 'Diagnostic Monitor', icon: '🖥️', cost: 1500, bonus: 0.15 },
        { id: 'examTable', name: 'Modern Exam Table', icon: '🛏️', cost: 3000, bonus: 0.20 },
        { id: 'examCart', name: 'Medical Cart Pro', icon: '🧰', cost: 1000, bonus: 0.10 },
      ],
      surgery: [
        { id: 'surgLight', name: 'Advanced Lighting', icon: '💡', cost: 6000, bonus: 0.15 },
        { id: 'surgArm', name: 'Robotic Arm', icon: '🦾', cost: 15000, bonus: 0.25 },
        { id: 'surgSterilize', name: 'Sterilization Unit', icon: '🧼', cost: 5000, bonus: 0.15 },
      ],
      icu: [
        { id: 'icuMonitor', name: 'Vital Monitors', icon: '📈', cost: 12000, bonus: 0.15 },
        { id: 'icuGenerator', name: 'Backup Generator', icon: '🔋', cost: 9000, bonus: 0.10 },
        { id: 'icuBeds', name: 'Premium Beds', icon: '🛌', cost: 18000, bonus: 0.20 },
      ],
      pharmacy: [
        { id: 'pharmInventory', name: 'Inventory System', icon: '📦', cost: 2000, bonus: 0.15 },
        { id: 'pharmShelving', name: 'Extra Shelving', icon: '🗄️', cost: 1200, bonus: 0.10 },
        { id: 'pharmCounter', name: 'Fast Dispense Counter', icon: '⚡', cost: 3500, bonus: 0.20 },
      ],
      lab: [
        { id: 'labScope', name: 'Microscope Pro', icon: '🔬', cost: 7000, bonus: 0.15 },
        { id: 'labFridge', name: 'Sample Fridge', icon: '🧊', cost: 4500, bonus: 0.10 },
        { id: 'labAuto', name: 'Automation Rig', icon: '🤖', cost: 10000, bonus: 0.20 },
      ],
    };

    // Patient system
    this.patientTypes = [
      { id: 0, name: 'Checkup', revenuePerPatient: 50, reputationReward: 1, prestigeRequired: 0, unlocked: true, icon: '🏥', weight: 0.4, color: 0x4CAF50 },
      { id: 1, name: 'Emergency', revenuePerPatient: 250, reputationReward: 5, prestigeRequired: 2, unlocked: false, icon: '🚑', weight: 0.2, color: 0xFF6B6B },
      { id: 2, name: 'Surgery', revenuePerPatient: 800, reputationReward: 20, prestigeRequired: 8, unlocked: false, icon: '🔪', weight: 0.15, color: 0xFF9800 },
      { id: 3, name: 'ICU', revenuePerPatient: 1500, reputationReward: 30, prestigeRequired: 15, unlocked: false, icon: '💊', weight: 0.1, color: 0xF44336 },
      { id: 4, name: 'Maternity', revenuePerPatient: 1200, reputationReward: 25, prestigeRequired: 10, unlocked: false, icon: '👶', weight: 0.15, color: 0xE91E63 },
    ];

    // Hospitals
    this.hospitals = [
      { id: 0, name: 'Community Clinic', incomeMultiplier: 1, cost: 0, unlocked: true, prestige: 0, color: 0xe3f2fd },
      { id: 1, name: 'Regional Hospital', incomeMultiplier: 2.5, cost: 50000, unlocked: false, prestige: 0, color: 0xb3e5fc },
      { id: 2, name: 'Metropolitan Medical Center', incomeMultiplier: 5, cost: 500000, unlocked: false, prestige: 0, color: 0x80deea },
      { id: 3, name: 'Elite Private Hospital', incomeMultiplier: 10, cost: 5000000, unlocked: false, prestige: 5, color: 0x4dd0e1 },
      { id: 4, name: 'World-Class Medical Complex', incomeMultiplier: 20, cost: 50000000, unlocked: false, prestige: 25, color: 0x0097a7 },
    ];

    // Game content
    this.patientQueue = [];
    this.activeTreatments = [];
    this.checkingInPatients = [];
    this.patientsServed = 0;

    // Reception system
    this.receptionists = [];
    this.receptionUpgrades = [
      { id: 'rec-desk-v1', name: 'Premium Reception Desk', icon: '🏢', cost: 500, speedBonus: 0.15 },
      { id: 'rec-system-v1', name: 'Check-in System', icon: '💻', cost: 1500, speedBonus: 0.20 },
      { id: 'rec-queue', name: 'Queue Management', icon: '📋', cost: 2500, speedBonus: 0.25 },
      { id: 'rec-kiosk', name: 'Self-Service Kiosk', icon: '🖥️', cost: 5000, speedBonus: 0.30 },
    ];
    this.receptionUpgradesBought = [];

    // Advertising system
    this.advertisingLevel = 0;
    this.advertisingUpgrades = [
      { id: 'ad-basic', name: 'Local Flyers', icon: '📰', cost: 500, spawnBonus: 0.25 },
      { id: 'ad-radio', name: 'Radio Ads', icon: '📻', cost: 2000, spawnBonus: 0.5 },
      { id: 'ad-social', name: 'Social Media', icon: '📱', cost: 5000, spawnBonus: 0.75 },
      { id: 'ad-billboard', name: 'Billboard Campaign', icon: '🎯', cost: 15000, spawnBonus: 1.0 },
    ];
    this.advertisingBought = [];
    this.patientSpawnInterval = 2.0;
    this.missions = [
      { id: 0, name: 'First Patient', desc: 'Serve 1 patient', target: 1, current: 0, reward: 100, reputationReward: 5, completed: false },
      { id: 1, name: 'Busy Day', desc: 'Serve 10 patients', target: 10, current: 0, reward: 500, reputationReward: 20, completed: false },
      { id: 2, name: 'Team Leader', desc: 'Hire 5 staff', target: 5, current: 0, reward: 1000, reputationReward: 50, completed: false },
      { id: 3, name: 'Surgical Genius', desc: 'Hire 1 Specialist', target: 1, current: 0, reward: 2000, reputationReward: 100, completed: false },
      { id: 4, name: 'Hospital Chain', desc: 'Unlock 3 hospitals', target: 3, current: 0, reward: 5000, reputationReward: 250, completed: false },
    ];

    // Event system for UI updates
    this.listeners = {};

    this.maxQueueSize = 12;

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

  // ========== STAFF SYSTEM ==========

  getStaffCost(tier) {
    const tierData = this.staffTiers[tier];
    const count = this.staffByTier[tier].length;
    return Math.floor(tierData.baseHireCost * Math.pow(tierData.costMultiplier, count));
  }

  canHireStaff(tier) {
    const tierData = this.staffTiers[tier];
    const cost = this.getStaffCost(tier);
    return this.money >= cost && (tier === 'intern' || this.reputation >= tierData.reputationCost);
  }

  hireStaff(tier) {
    if (!this.canHireStaff(tier)) return false;

    const cost = this.getStaffCost(tier);
    const tierData = this.staffTiers[tier];
    this.money -= cost;
    this.reputation -= tierData.reputationCost;

    this.staffByTier[tier].push({
      id: Math.random(),
      tier,
      efficiency: tierData.efficiency,
      busy: false,
    });

    this.updateMission('Team Leader');
    if (tier === 'specialist') this.updateMission('Surgical Genius');
    this.updateMoneyPerSecond();
    this.saveGame();
    this.emit('staffHired', { tier, cost });
    return true;
  }

  getTotalStaff() {
    return Object.values(this.staffByTier).reduce((sum, arr) => sum + arr.length, 0);
  }

  // ========== PATIENT SYSTEM ==========

  generatePatient() {
    const unlockedTypes = this.patientTypes.filter((p) => p.unlocked);
    if (unlockedTypes.length === 0) return null;

    const totalWeight = unlockedTypes.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const patient of unlockedTypes) {
      random -= patient.weight;
      if (random <= 0) return { ...patient, id: Math.random() };
    }
    return unlockedTypes[0];
  }

  addPatientToQueue() {
    const patient = this.generatePatient();
    if (patient) {
      patient.state = 'waiting_checkin';
      patient.checkInTime = 0;
      patient.waitTime = 0;
      patient.mood = 1.0;
      this.patientQueue.push(patient);
      this.emit('patientAdded', patient);
    }
  }

  getMoodColor(mood) {
    if (mood > 0.6) return 0x4caf50;
    if (mood > 0.3) return 0xffc107;
    return 0xf44336;
  }

  updatePatientMood(deltaTime) {
    const moodDecayRate = 0.15;
    for (let i = this.patientQueue.length - 1; i >= 0; i--) {
      const p = this.patientQueue[i];
      p.waitTime += deltaTime;
      p.mood = Math.max(0, 1.0 - (p.waitTime * moodDecayRate));
      if (p.mood <= 0) {
        this.patientQueue.splice(i, 1);
        this.emit('patientLeft', { patient: p });
      }
    }
    for (let i = this.checkingInPatients.length - 1; i >= 0; i--) {
      const p = this.checkingInPatients[i];
      p.waitTime += deltaTime;
      p.mood = Math.max(0, 1.0 - (p.waitTime * moodDecayRate));
      if (p.mood <= 0) {
        this.checkingInPatients.splice(i, 1);
        this.emit('patientLeft', { patient: p });
      }
    }
  }

  getCheckInDuration() {
    let baseDuration = 1.2;
    const receptionistBonus = this.receptionists.length * 0.15;
    const upgradeBonus = this.receptionUpgradesBought.reduce((sum, upId) => {
      const upg = this.receptionUpgrades.find((u) => u.id === upId);
      return sum + (upg ? upg.speedBonus : 0);
    }, 0);
    const totalSpeedBonus = receptionistBonus + upgradeBonus;
    return Math.max(0.3, baseDuration / (1 + totalSpeedBonus));
  }

  getReceptionistCost() {
    const baseCost = 200;
    const count = this.receptionists.length;
    return Math.floor(baseCost * Math.pow(1.15, count));
  }

  canHireReceptionist() {
    return this.money >= this.getReceptionistCost();
  }

  hireReceptionist() {
    if (!this.canHireReceptionist()) return false;
    const cost = this.getReceptionistCost();
    this.money -= cost;
    this.receptionists.push({ id: Math.random() });
    this.saveGame();
    this.emit('receptionistHired', { cost, count: this.receptionists.length });
    return true;
  }

  buyReceptionUpgrade(upgradeId) {
    if (this.receptionUpgradesBought.includes(upgradeId)) return false;
    const upg = this.receptionUpgrades.find((u) => u.id === upgradeId);
    if (!upg || this.money < upg.cost) return false;
    this.money -= upg.cost;
    this.receptionUpgradesBought.push(upgradeId);
    this.saveGame();
    this.emit('receptionUpgradeBought', { upgrade: upg });
    return true;
  }

  getPatientSpawnRate() {
    const baseRate = 1.0;
    const adBonus = this.advertisingBought.reduce((sum, adId) => {
      const ad = this.advertisingUpgrades.find((a) => a.id === adId);
      return sum + (ad ? ad.spawnBonus : 0);
    }, 0);
    return 1 + adBonus;
  }

  canBuyAdvertising(adId) {
    if (this.advertisingBought.includes(adId)) return false;
    const ad = this.advertisingUpgrades.find((a) => a.id === adId);
    return !!ad && this.money >= ad.cost;
  }

  buyAdvertising(adId) {
    if (!this.canBuyAdvertising(adId)) return false;
    const ad = this.advertisingUpgrades.find((a) => a.id === adId);
    this.money -= ad.cost;
    this.advertisingBought.push(adId);
    this.patientSpawnInterval = 2.0 / this.getPatientSpawnRate();
    this.saveGame();
    this.emit('advertisingBought', { ad });
    return true;
  }

  startPatientCheckIn() {
    if (this.patientQueue.length === 0) return false;
    const patient = this.patientQueue.shift();
    patient.state = 'checking_in';
    patient.checkInRemaining = this.getCheckInDuration();
    this.checkingInPatients.push(patient);
    this.emit('patientCheckInStarted', { patient });
    return true;
  }

  updateCheckIns(deltaTime) {
    for (let i = this.checkingInPatients.length - 1; i >= 0; i--) {
      const patient = this.checkingInPatients[i];
      patient.checkInRemaining -= deltaTime;
      if (patient.checkInRemaining <= 0) {
        patient.state = 'waiting_treatment';
        this.patientQueue.push(patient);
        this.checkingInPatients.splice(i, 1);
        this.emit('patientCheckedIn', { patient });
      }
    }
  }

  getIdleStaff() {
    const idle = [];
    Object.values(this.staffByTier).forEach((list) => {
      list.forEach((s) => { if (!s.busy) idle.push(s); });
    });
    return idle;
  }

  getTreatmentDuration(staff, room = null) {
    let duration = Math.max(0.6, 5 / staff.efficiency);
    if (room) {
      const furnitureBonus = this.getFurnitureBonus(room);
      duration = duration / furnitureBonus;

      const roomMult = {
        reception: 0.8,
        pharmacy: 1.2,
        examination: 1.0,
        lab: 1.5,
        surgery: 2.0,
        icu: 2.5,
      };
      duration = duration * (roomMult[room.type] || 1.0);
    }
    return Math.max(0.3, duration);
  }

  canTreatPatient() {
    return this.patientQueue.length > 0 && this.getIdleStaff().length > 0;
  }

  assignNextPatient() {
    if (this.patientQueue.length === 0) return false;
    const idle = this.getIdleStaff();
    if (idle.length === 0) return false;

    const staff = idle[0];
    const patient = this.patientQueue.shift();
    patient.state = 'in_treatment';
    staff.busy = true;

    const allStaff = [];
    Object.entries(this.staffByTier).forEach(([tier, list]) => {
      list.forEach((s) => allStaff.push(s));
    });
    const staffIdx = allStaff.indexOf(staff);
    const roomIdx = staffIdx % this.rooms.length;
    const room = this.rooms[roomIdx];

    const duration = this.getTreatmentDuration(staff, room);
    this.activeTreatments.push({ id: Math.random(), patient, staff, roomIdx, remaining: duration, duration });
    this.emit('treatmentStarted', { patient, staff, duration });
    return true;
  }

  treatPatient() {
    return this.assignNextPatient();
  }

  updateTreatments(deltaTime) {
    for (let i = this.activeTreatments.length - 1; i >= 0; i--) {
      const treatment = this.activeTreatments[i];
      treatment.remaining -= deltaTime;
      if (treatment.remaining <= 0) {
        const { patient, staff } = treatment;
        this.money += patient.revenuePerPatient;
        this.reputation += patient.reputationReward;
        this.patientsServed += 1;
        staff.busy = false;
        patient.state = 'completed';

        this.updateMission('First Patient');
        this.updateMission('Busy Day');
        this.emit('treatmentCompleted', { patient, staff });
        this.activeTreatments.splice(i, 1);
      }
    }
  }

  // ========== ROOM SYSTEM ==========

  getRoomCost(room) {
    return Math.floor(room.baseCost * Math.pow(room.costMultiplier, room.owned));
  }

  getRoomProduction(room) {
    const base = room.baseProduction * Math.pow(room.productionMultiplier, room.level - 1);
    return Math.floor(base * this.getFurnitureBonus(room));
  }

  // ========== FURNITURE / EQUIPMENT ==========

  getFurnitureCatalog(roomIdx) {
    const room = this.rooms[roomIdx];
    return (room && this.furnitureCatalog[room.type]) || [];
  }

  getFurnitureBonus(room) {
    const catalog = this.furnitureCatalog[room.type] || [];
    return (room.furniture || []).reduce((mult, itemId) => {
      const item = catalog.find((f) => f.id === itemId);
      return item ? mult * (1 + item.bonus) : mult;
    }, 1);
  }

  ownsFurniture(roomIdx, itemId) {
    const room = this.rooms[roomIdx];
    return !!room && room.furniture.includes(itemId);
  }

  canBuyFurniture(roomIdx, itemId) {
    if (this.ownsFurniture(roomIdx, itemId)) return false;
    const item = this.getFurnitureCatalog(roomIdx).find((f) => f.id === itemId);
    return !!item && this.money >= item.cost;
  }

  buyFurniture(roomIdx, itemId) {
    if (!this.canBuyFurniture(roomIdx, itemId)) return false;
    const room = this.rooms[roomIdx];
    const item = this.getFurnitureCatalog(roomIdx).find((f) => f.id === itemId);

    this.money -= item.cost;
    room.furniture.push(itemId);
    this.updateMoneyPerSecond();
    this.saveGame();
    this.emit('furnitureBought', { roomIdx, itemId, room, item });
    return true;
  }

  buyRoom(roomId) {
    const room = this.rooms[roomId];
    const cost = this.getRoomCost(room);

    if (this.money >= cost) {
      this.money -= cost;
      room.owned += 1;
      this.updateMoneyPerSecond();
      this.saveGame();
      this.emit('roomBought', { room, cost });
      return true;
    }
    return false;
  }

  upgradeRoom(roomId) {
    const room = this.rooms[roomId];
    if (room.owned === 0) return false;

    const upgradeCost = Math.floor(this.getRoomCost(room) * 0.5);
    if (this.money >= upgradeCost) {
      this.money -= upgradeCost;
      room.level += 1;
      this.updateMoneyPerSecond();
      this.saveGame();
      this.emit('roomUpgraded', { room, cost: upgradeCost });
      return true;
    }
    return false;
  }

  // ========== ROOM UNLOCKS ==========

  getRoomUnlockProgress(roomType) {
    const req = this.roomUnlocks[roomType];
    if (!req) return null;
    return {
      prestige: { current: this.totalPrestige, required: req.prestige },
      money: { current: this.money, required: req.money },
      reputation: { current: this.reputation, required: req.reputation },
      patients: { current: this.patientsServed, required: req.patients },
    };
  }

  canUnlockRoom(roomType) {
    const room = this.rooms.find((r) => r.type === roomType);
    if (!room || room.unlocked) return false;
    const req = this.roomUnlocks[roomType];
    return (
      this.totalPrestige >= req.prestige &&
      this.money >= req.money &&
      this.reputation >= req.reputation &&
      this.patientsServed >= req.patients
    );
  }

  unlockRoom(roomType) {
    const room = this.rooms.find((r) => r.type === roomType);
    if (!room || room.unlocked) return false;
    room.unlocked = true;
    room.unlockedAt = this.time;
    this.saveGame();
    this.emit('roomUnlocked', { room, type: roomType });
    return true;
  }

  // ========== SYNERGIES ==========

  calculateSynergies() {
    const surgeonCount = this.staffByTier.specialist.length;
    let synergyBonus = 1;

    if (surgeonCount >= 3) synergyBonus *= 2;
    if (surgeonCount >= 5) synergyBonus *= 1.5;

    return synergyBonus;
  }

  // ========== PRODUCTION ==========

  getPrestigeMultiplier() {
    return 1 + this.totalPrestige * 0.15;
  }

  updateMoneyPerSecond() {
    let mps = 0;

    this.rooms.forEach((room) => {
      if (room.owned > 0) {
        mps += this.getRoomProduction(room) * room.owned;
      }
    });

    Object.entries(this.staffByTier).forEach(([tier, staff]) => {
      const tierData = this.staffTiers[tier];
      staff.forEach(() => {
        mps += tierData.efficiency;
      });
    });

    mps *= this.calculateSynergies();
    mps *= this.getPrestigeMultiplier();
    mps *= this.hospitals[this.currentHospital].incomeMultiplier;

    this.moneyPerSecond = mps;
  }

  upgradeHospital(hospitalId) {
    const hospital = this.hospitals[hospitalId];
    if (!hospital || hospital.unlocked || this.money < hospital.cost || this.totalPrestige < hospital.prestige) {
      return false;
    }

    this.money -= hospital.cost;
    hospital.unlocked = true;
    this.currentHospital = hospitalId;
    this.updateMoneyPerSecond();
    this.checkUnlocks();
    this.saveGame();
    this.emit('hospitalUpgraded', hospital);
    return true;
  }

  // ========== MISSIONS ==========

  updateMission(missionName) {
    const mission = this.missions.find((m) => m.name === missionName);
    if (mission && !mission.completed) {
      mission.current += 1;
      if (mission.current >= mission.target) {
        mission.completed = true;
        this.money += mission.reward;
        this.reputation += mission.reputationReward;
        this.emit('missionCompleted', mission);
      }
    }
  }

  // ========== PRESTIGE ==========

  getPrestigeGain() {
    return Math.floor(Math.sqrt(this.money / 1000));
  }

  prestige() {
    const basePrestige = this.getPrestigeGain();
    if (basePrestige === 0) return 0;

    this.totalPrestige += basePrestige;
    this.money = 0;
    this.reputation = 0;
    this.moneyPerSecond = 0;

    this.staffByTier = { intern: [], resident: [], attending: [], specialist: [] };
    this.currentHospital = 0;
    this.rooms.forEach((room) => {
      if (room.type !== 'reception') {
        room.owned = 0;
        room.level = 1;
      }
    });
    this.patientQueue = [];
    this.activeTreatments = [];
    this.checkingInPatients = [];
    this.receptionists = [];

    this.updateMoneyPerSecond();
    this.checkUnlocks();
    this.saveGame();
    this.emit('prestigeGained', basePrestige);
    return basePrestige;
  }

  // ========== UNLOCKS ==========

  checkUnlocks() {
    this.patientTypes.forEach((pt) => {
      if (!pt.unlocked && this.totalPrestige >= pt.prestigeRequired) {
        pt.unlocked = true;
        this.emit('patientTypeUnlocked', pt);
      }
    });

    this.hospitals.forEach((h) => {
      if (!h.unlocked && this.totalPrestige >= h.prestige) {
        this.emit('hospitalUnlocked', h);
      }
    });
  }

  // ========== GAME LOOP ==========

  startGameLoop() {
    this.patientSpawnTimer = 0;
    this.patientSpawnInterval = 2.5; // seconds between spawn attempts
    this.saveTimer = 0;
    this.saveInterval = 1; // seconds between autosaves

    setInterval(() => {
      const now = Date.now();
      this.deltaTime = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.time += this.deltaTime;

      this.money += this.moneyPerSecond * this.deltaTime;
      this.checkUnlocks();

      this.updatePatientMood(this.deltaTime);
      this.updateCheckIns(this.deltaTime);
      if (this.checkingInPatients.length < 2) {
        this.startPatientCheckIn();
      }

      this.updateTreatments(this.deltaTime);
      while (this.assignNextPatient()) {
        // keep assigning idle staff to waiting patients until none are left
      }

      this.patientSpawnTimer += this.deltaTime;
      if (this.patientSpawnTimer >= this.patientSpawnInterval) {
        this.patientSpawnTimer = 0;
        if (this.patientQueue.length < this.maxQueueSize) {
          this.addPatientToQueue();
        }
      }

      this.saveTimer += this.deltaTime;
      if (this.saveTimer >= this.saveInterval) {
        this.saveTimer = 0;
        this.saveGame();
      }
    }, 16);
  }

  // ========== SAVE/LOAD ==========

  saveGame() {
    const saveData = {
      money: this.money,
      reputation: this.reputation,
      currentHospital: this.currentHospital,
      totalPrestige: this.totalPrestige,
      staffByTier: this.staffByTier,
      rooms: this.rooms,
      patientTypes: this.patientTypes,
      hospitals: this.hospitals,
      missions: this.missions,
      patientQueue: this.patientQueue,
    };
    localStorage.setItem('hospitalGameSave', JSON.stringify(saveData));
  }

  loadGame() {
    const saveData = localStorage.getItem('hospitalGameSave');
    if (saveData) {
      const data = JSON.parse(saveData);
      // Reset corrupted old saves where money is unreasonably high
      this.money = (data.money || 0) > 50000 ? 5000 : (data.money || 0);
      this.reputation = data.reputation || 0;
      this.currentHospital = data.currentHospital || 0;
      this.totalPrestige = data.totalPrestige || 0;
      this.staffByTier = data.staffByTier || this.staffByTier;
      // Treatment progress can't be meaningfully restored, so clear it and
      // make sure no staff stay permanently locked as "busy" from a stale save.
      Object.values(this.staffByTier).forEach((list) => {
        list.forEach((s) => { s.busy = false; });
      });
      this.activeTreatments = [];
      this.checkingInPatients = [];
      this.patientsServed = data.patientsServed || 0;

      // Merge loaded rooms with roomTypes to restore color properties
      if (data.rooms) {
        this.rooms = data.rooms.map((loadedRoom, idx) => ({
          ...this.roomTypes[idx],
          ...loadedRoom,
          furniture: loadedRoom.furniture || [],
        }));
      }

      this.receptionists = data.receptionists || [];
      this.receptionUpgradesBought = data.receptionUpgradesBought || [];

      this.patientTypes = data.patientTypes || this.patientTypes;
      this.hospitals = data.hospitals || this.hospitals;
      this.missions = data.missions || this.missions;
      this.patientQueue = (data.patientQueue || []).slice(0, this.maxQueueSize);
      this.updateMoneyPerSecond();
    }
  }
}

export default GameEngine;

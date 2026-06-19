// Idle Hospital Empire - Enhanced Game Engine
class GameEngine {
  constructor() {
    this.money = 0;
    this.reputation = 0;
    this.moneyPerSecond = 0;
    this.currentHospital = 0;
    this.totalPrestige = 0;

    // Staff system with tiers
    this.staffByTier = {
      intern: [],
      resident: [],
      attending: [],
      specialist: [],
    };

    // Staff tier definitions
    this.staffTiers = {
      intern: { name: 'Intern', salary: 50, efficiency: 1, costMultiplier: 1.1, reputationCost: 0 },
      resident: { name: 'Resident', salary: 150, efficiency: 2.5, costMultiplier: 1.15, reputationCost: 10 },
      attending: { name: 'Attending', salary: 400, efficiency: 6, costMultiplier: 1.2, reputationCost: 50 },
      specialist: { name: 'Specialist', salary: 1000, efficiency: 15, costMultiplier: 1.25, reputationCost: 200 },
    };

    this.rooms = [];
    this.patientTypes = [];
    this.hospitals = [];
    this.patientQueue = [];
    this.missions = [];
    this.events = [];
    this.synergies = {};

    this.initializeHospitals();
    this.initializePatientTypes();
    this.initializeRooms();
    this.initializeMissions();
    this.loadGame();
    this.startGameLoop();
  }

  // ============ INITIALIZATION ============

  initializeHospitals() {
    this.hospitals = [
      { id: 0, name: 'Community Clinic', incomeMultiplier: 1, cost: 0, unlocked: true, prestige: 0 },
      { id: 1, name: 'Regional Hospital', incomeMultiplier: 2.5, cost: 50000, unlocked: false, prestige: 0 },
      { id: 2, name: 'Metropolitan Medical Center', incomeMultiplier: 5, cost: 500000, unlocked: false, prestige: 0 },
      { id: 3, name: 'Elite Private Hospital', incomeMultiplier: 10, cost: 5000000, unlocked: false, prestige: 5 },
      { id: 4, name: 'World-Class Medical Complex', incomeMultiplier: 20, cost: 50000000, unlocked: false, prestige: 25 },
    ];
  }

  initializePatientTypes() {
    this.patientTypes = [
      {
        id: 0,
        name: 'General Checkup',
        revenuePerPatient: 50,
        reputationReward: 1,
        prestigeRequired: 0,
        unlocked: true,
        icon: '🏥',
        weight: 0.4,
      },
      {
        id: 1,
        name: 'Emergency Care',
        revenuePerPatient: 250,
        reputationReward: 5,
        prestigeRequired: 2,
        unlocked: false,
        icon: '🚑',
        weight: 0.2,
      },
      {
        id: 2,
        name: 'Surgery',
        revenuePerPatient: 800,
        reputationReward: 20,
        prestigeRequired: 8,
        unlocked: false,
        icon: '🔪',
        weight: 0.15,
      },
      {
        id: 3,
        name: 'ICU Care',
        revenuePerPatient: 1500,
        reputationReward: 30,
        prestigeRequired: 15,
        unlocked: false,
        icon: '💊',
        weight: 0.1,
      },
      {
        id: 4,
        name: 'Maternity',
        revenuePerPatient: 1200,
        reputationReward: 25,
        prestigeRequired: 10,
        unlocked: false,
        icon: '👶',
        weight: 0.15,
      },
    ];
  }

  initializeRooms() {
    this.rooms = [
      {
        id: 0,
        name: 'Reception',
        type: 'reception',
        baseCost: 50,
        costMultiplier: 1.12,
        baseProduction: 3,
        productionMultiplier: 1.15,
        owned: 1,
        level: 1,
        icon: '🪑',
        staffCapacity: 5,
      },
      {
        id: 1,
        name: 'Examination Room',
        type: 'examination',
        baseCost: 800,
        costMultiplier: 1.13,
        baseProduction: 25,
        productionMultiplier: 1.18,
        owned: 0,
        level: 1,
        icon: '🔬',
        staffCapacity: 3,
      },
      {
        id: 2,
        name: 'Surgery Suite',
        type: 'surgery',
        baseCost: 5000,
        costMultiplier: 1.14,
        baseProduction: 80,
        productionMultiplier: 1.2,
        owned: 0,
        level: 1,
        icon: '⚕️',
        staffCapacity: 4,
      },
      {
        id: 3,
        name: 'ICU Ward',
        type: 'icu',
        baseCost: 15000,
        costMultiplier: 1.14,
        baseProduction: 200,
        productionMultiplier: 1.22,
        owned: 0,
        level: 1,
        icon: '🏨',
        staffCapacity: 6,
      },
      {
        id: 4,
        name: 'Pharmacy',
        type: 'pharmacy',
        baseCost: 2000,
        costMultiplier: 1.13,
        baseProduction: 40,
        productionMultiplier: 1.17,
        owned: 0,
        level: 1,
        icon: '💉',
        staffCapacity: 2,
      },
      {
        id: 5,
        name: 'Lab',
        type: 'lab',
        baseCost: 8000,
        costMultiplier: 1.14,
        baseProduction: 100,
        productionMultiplier: 1.2,
        owned: 0,
        level: 1,
        icon: '🧪',
        staffCapacity: 3,
      },
    ];
  }

  initializeMissions() {
    this.missions = [
      { id: 0, name: 'First Patient', desc: 'Serve 1 patient', target: 1, current: 0, reward: 100, reputationReward: 5, completed: false },
      { id: 1, name: 'Busy Day', desc: 'Serve 10 patients', target: 10, current: 0, reward: 500, reputationReward: 20, completed: false },
      { id: 2, name: 'Popular Doc', desc: 'Hire 5 staff members', target: 5, current: 0, reward: 1000, reputationReward: 50, completed: false },
      { id: 3, name: 'Surgeon', desc: 'Hire 1 Specialist', target: 1, current: 0, reward: 2000, reputationReward: 100, completed: false },
    ];
  }

  // ============ STAFF HIRING & MANAGEMENT ============

  getStaffCost(tier) {
    const tierData = this.staffTiers[tier];
    const count = this.staffByTier[tier].length;
    return Math.floor(1000 * Math.pow(tierData.costMultiplier, count));
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
    });

    this.updateMission('Hire 5 staff members');
    if (tier === 'specialist') this.updateMission('Hire 1 Specialist');

    this.updateMoneyPerSecond();
    this.saveGame();
    return true;
  }

  getTotalStaff() {
    return Object.values(this.staffByTier).reduce((sum, arr) => sum + arr.length, 0);
  }

  // ============ PATIENT & CLICKING SYSTEM ============

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
      this.patientQueue.push(patient);
    }
  }

  servePatient() {
    if (this.patientQueue.length === 0) return null;

    const patient = this.patientQueue.shift();
    this.money += patient.revenuePerPatient;
    this.reputation += patient.reputationReward;

    this.updateMission('Serve 1 patient');
    this.updateMission('Serve 10 patients');

    this.saveGame();
    return patient;
  }

  // ============ ROOM & PRODUCTION ============

  getRoomCost(room) {
    return Math.floor(room.baseCost * Math.pow(room.costMultiplier, room.owned));
  }

  getRoomProduction(room) {
    return Math.floor(room.baseProduction * Math.pow(room.productionMultiplier, room.level - 1));
  }

  buyRoom(roomId) {
    const room = this.rooms[roomId];
    const cost = this.getRoomCost(room);

    if (this.money >= cost) {
      this.money -= cost;
      room.owned += 1;
      this.updateMoneyPerSecond();
      this.saveGame();
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
      return true;
    }
    return false;
  }

  // ============ STAFF SYNERGIES ============

  calculateSynergies() {
    const surgeonCount = this.staffByTier.specialist.filter((s) => s.tier === 'specialist').length;
    let synergyBonus = 1;

    if (surgeonCount >= 3) {
      synergyBonus *= 2; // 3+ specialists = 2x bonus
    }
    if (surgeonCount >= 5) {
      synergyBonus *= 1.5; // 5+ specialists = 3x total
    }

    return synergyBonus;
  }

  // ============ PRODUCTION ============

  getPrestigeMultiplier() {
    return 1 + this.totalPrestige * 0.15;
  }

  updateMoneyPerSecond() {
    let mps = 0;

    // Room production
    this.rooms.forEach((room) => {
      if (room.owned > 0) {
        mps += this.getRoomProduction(room) * room.owned;
      }
    });

    // Staff production
    Object.entries(this.staffByTier).forEach(([tier, staff]) => {
      const tierData = this.staffTiers[tier];
      staff.forEach((member) => {
        mps += tierData.efficiency;
      });
    });

    // Apply synergy bonus
    mps *= this.calculateSynergies();

    // Apply prestige multiplier
    mps *= this.getPrestigeMultiplier();

    // Apply hospital multiplier
    const hospital = this.hospitals[this.currentHospital];
    mps *= hospital.incomeMultiplier;

    this.moneyPerSecond = mps;
  }

  upgradeHospital(hospitalId) {
    const hospital = this.hospitals[hospitalId];
    if (!hospital || hospital.unlocked || this.money < hospital.cost) {
      return false;
    }

    this.money -= hospital.cost;
    hospital.unlocked = true;
    this.currentHospital = hospitalId;
    this.updateMoneyPerSecond();
    this.saveGame();
    return true;
  }

  // ============ MISSIONS ============

  updateMission(missionName) {
    const mission = this.missions.find((m) => m.name === missionName);
    if (mission && !mission.completed) {
      mission.current += 1;
      if (mission.current >= mission.target) {
        mission.completed = true;
        this.money += mission.reward;
        this.reputation += mission.reputationReward;
      }
    }
  }

  // ============ PRESTIGE ============

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

    // Reset staff
    this.staffByTier = { intern: [], resident: [], attending: [], specialist: [] };

    // Reset rooms except reception
    this.currentHospital = 0;
    this.rooms.forEach((room) => {
      if (room.name !== 'Reception') {
        room.owned = 0;
        room.level = 1;
      } else {
        room.level = 1;
      }
    });

    // Reset patient queue
    this.patientQueue = [];

    this.updateMoneyPerSecond();
    this.checkUnlocks();
    this.saveGame();
    return basePrestige;
  }

  // ============ UNLOCKS ============

  checkUnlocks() {
    this.patientTypes.forEach((pt) => {
      if (!pt.unlocked && this.totalPrestige >= pt.prestigeRequired) {
        pt.unlocked = true;
        if (!this.unlockedNotifications) this.unlockedNotifications = [];
        this.unlockedNotifications.push({
          text: `Unlocked: ${pt.icon} ${pt.name}`,
          time: Date.now(),
        });
      }
    });
  }

  // ============ GAME LOOP ============

  startGameLoop() {
    // Passive income tick
    setInterval(() => {
      this.money += this.moneyPerSecond / 10;
      this.checkUnlocks();

      // Occasionally add patients to queue
      if (Math.random() < 0.3) {
        this.addPatientToQueue();
      }

      this.saveGame();
    }, 100);
  }

  // ============ SAVE/LOAD ============

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
      this.money = data.money || 0;
      this.reputation = data.reputation || 0;
      this.currentHospital = data.currentHospital || 0;
      this.totalPrestige = data.totalPrestige || 0;
      this.staffByTier = data.staffByTier || this.staffByTier;
      this.rooms = data.rooms || this.rooms;
      this.patientTypes = data.patientTypes || this.patientTypes;
      this.hospitals = data.hospitals || this.hospitals;
      this.missions = data.missions || this.missions;
      this.patientQueue = data.patientQueue || [];
      this.updateMoneyPerSecond();
    }
  }
}

export default GameEngine;

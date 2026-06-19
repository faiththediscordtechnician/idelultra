// Game state and logic
class GameEngine {
  constructor() {
    this.money = 0;
    this.moneyPerSecond = 0;
    this.currentHospital = 0;
    this.totalPrestige = 0;
    this.gameVersion = 1;

    this.doctors = [];
    this.nurses = [];
    this.rooms = [];
    this.patientTypes = [];
    this.hospitals = [];

    this.initializeHospitals();
    this.initializePatientTypes();
    this.initializeRooms();
    this.loadGame();
    this.startGameLoop();
  }

  initializeHospitals() {
    this.hospitals = [
      { id: 0, name: 'Community Clinic', incomeMultiplier: 1, cost: 0, unlocked: true },
      { id: 1, name: 'Regional Hospital', incomeMultiplier: 2.5, cost: 10000, unlocked: false },
      { id: 2, name: 'Metropolitan Medical Center', incomeMultiplier: 5, cost: 100000, unlocked: false },
      { id: 3, name: 'Elite Private Hospital', incomeMultiplier: 10, cost: 500000, unlocked: false },
      { id: 4, name: 'World-Class Medical Complex', incomeMultiplier: 20, cost: 2000000, unlocked: false },
    ];
  }

  initializePatientTypes() {
    this.patientTypes = [
      {
        id: 0,
        name: 'General Checkup',
        revenuePerPatient: 50,
        unlockedAt: 0,
        unlocked: true,
        icon: '🏥',
      },
      {
        id: 1,
        name: 'Emergency Care',
        revenuePerPatient: 200,
        unlockedAt: 500,
        unlocked: false,
        icon: '🚑',
      },
      {
        id: 2,
        name: 'Surgery',
        revenuePerPatient: 500,
        unlockedAt: 2000,
        unlocked: false,
        icon: '🔪',
      },
      {
        id: 3,
        name: 'ICU Care',
        revenuePerPatient: 1000,
        unlockedAt: 5000,
        unlocked: false,
        icon: '💊',
      },
      {
        id: 4,
        name: 'Maternity',
        revenuePerPatient: 750,
        unlockedAt: 3000,
        unlocked: false,
        icon: '👶',
      },
    ];
  }

  initializeRooms() {
    this.rooms = [
      {
        id: 0,
        name: 'Reception',
        type: 'reception',
        baseCost: 100,
        costMultiplier: 1.15,
        baseProduction: 5,
        productionMultiplier: 1.2,
        owned: 1,
        level: 1,
        icon: '🪑',
      },
      {
        id: 1,
        name: 'Examination Room',
        type: 'examination',
        baseCost: 500,
        costMultiplier: 1.15,
        baseProduction: 20,
        productionMultiplier: 1.2,
        owned: 0,
        level: 1,
        icon: '🔬',
      },
      {
        id: 2,
        name: 'Surgery Suite',
        type: 'surgery',
        baseCost: 2000,
        costMultiplier: 1.15,
        baseProduction: 50,
        productionMultiplier: 1.2,
        owned: 0,
        level: 1,
        icon: '⚕️',
      },
      {
        id: 3,
        name: 'ICU Ward',
        type: 'icu',
        baseCost: 5000,
        costMultiplier: 1.15,
        baseProduction: 100,
        productionMultiplier: 1.2,
        owned: 0,
        level: 1,
        icon: '🏨',
      },
      {
        id: 4,
        name: 'Pharmacy',
        type: 'pharmacy',
        baseCost: 1000,
        costMultiplier: 1.15,
        baseProduction: 30,
        productionMultiplier: 1.2,
        owned: 0,
        level: 1,
        icon: '💉',
      },
      {
        id: 5,
        name: 'Lab',
        type: 'lab',
        baseCost: 3000,
        costMultiplier: 1.15,
        baseProduction: 60,
        productionMultiplier: 1.2,
        owned: 0,
        level: 1,
        icon: '🧪',
      },
    ];
  }

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

  buyDoctor() {
    const cost = 1000 + this.doctors.length * 500;
    if (this.money >= cost) {
      this.money -= cost;
      this.doctors.push({
        id: this.doctors.length,
        salary: cost * 0.1,
        efficiency: 1 + this.doctors.length * 0.05,
      });
      this.updateMoneyPerSecond();
      this.saveGame();
      return true;
    }
    return false;
  }

  buyNurse() {
    const cost = 300 + this.nurses.length * 100;
    if (this.money >= cost) {
      this.money -= cost;
      this.nurses.push({
        id: this.nurses.length,
        salary: cost * 0.15,
        efficiency: 1 + this.nurses.length * 0.02,
      });
      this.updateMoneyPerSecond();
      this.saveGame();
      return true;
    }
    return false;
  }

  updateMoneyPerSecond() {
    let mps = 0;

    // Add production from rooms
    this.rooms.forEach((room) => {
      if (room.owned > 0) {
        mps += this.getRoomProduction(room) * room.owned;
      }
    });

    // Add production from doctors
    this.doctors.forEach((doctor) => {
      mps += 10 * doctor.efficiency;
    });

    // Add production from nurses
    this.nurses.forEach((nurse) => {
      mps += 3 * nurse.efficiency;
    });

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

  prestige() {
    const basePrestige = Math.floor(Math.sqrt(this.money));
    this.totalPrestige += basePrestige;
    this.money = 0;
    this.moneyPerSecond = 0;
    this.doctors = [];
    this.nurses = [];
    this.currentHospital = 0;
    this.rooms.forEach((room) => {
      if (room.name !== 'Reception') {
        room.owned = 0;
        room.level = 1;
      } else {
        room.level = 1;
      }
    });
    this.updateMoneyPerSecond();
    this.saveGame();
    return basePrestige;
  }

  checkUnlocks() {
    this.patientTypes.forEach((pt) => {
      if (!pt.unlocked && this.totalPrestige >= pt.unlockedAt) {
        pt.unlocked = true;
      }
    });
  }

  startGameLoop() {
    setInterval(() => {
      this.money += this.moneyPerSecond / 10;
      this.checkUnlocks();
      this.saveGame();
    }, 100);
  }

  saveGame() {
    const saveData = {
      money: this.money,
      currentHospital: this.currentHospital,
      totalPrestige: this.totalPrestige,
      doctors: this.doctors,
      nurses: this.nurses,
      rooms: this.rooms,
      patientTypes: this.patientTypes,
      hospitals: this.hospitals,
    };
    localStorage.setItem('hospitalGameSave', JSON.stringify(saveData));
  }

  loadGame() {
    const saveData = localStorage.getItem('hospitalGameSave');
    if (saveData) {
      const data = JSON.parse(saveData);
      this.money = data.money || 0;
      this.currentHospital = data.currentHospital || 0;
      this.totalPrestige = data.totalPrestige || 0;
      this.doctors = data.doctors || [];
      this.nurses = data.nurses || [];
      this.rooms = data.rooms || this.rooms;
      this.patientTypes = data.patientTypes || this.patientTypes;
      this.hospitals = data.hospitals || this.hospitals;
      this.updateMoneyPerSecond();
    }
  }
}

export default GameEngine;

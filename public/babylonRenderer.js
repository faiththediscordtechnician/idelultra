import GameEngine from './gameEngine.js';

const BABYLON = window.BABYLON;

const ROOM_SIZE = 26;
const WALL_HEIGHT = 9;
const HALF = ROOM_SIZE / 2;
const GAP = 8;

const ROOM_DEFS = [
  { x: -(ROOM_SIZE + GAP), z: -(ROOM_SIZE + GAP) },
  { x: 0, z: -(ROOM_SIZE + GAP) },
  { x: (ROOM_SIZE + GAP), z: -(ROOM_SIZE + GAP) },
  { x: -(ROOM_SIZE + GAP), z: 0 },
  { x: 0, z: 0 },
  { x: (ROOM_SIZE + GAP), z: 0 },
];

class BabylonRenderer {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.staffMeshes = new Map();
    this.patientMeshes = new Map();

    try {
      container.style.width = '100%';
      container.style.height = '100%';

      this.engine = new BABYLON.Engine(container, true, { antialias: true });
      this.scene = new BABYLON.Scene(this.engine);
      this.scene.clearColor = new BABYLON.Color3(0.05, 0.08, 0.12);

      this.setupCamera();
      this.setupLights();
      this.buildHospital();
      this.setupGameEvents();

      window.addEventListener('resize', () => this.engine.resize());
      this.animate();

      console.log('✅ Babylon Renderer initialized');
    } catch (err) {
      console.error('❌ Babylon init error:', err);
    }
  }

  setupCamera() {
    const w = this.container.clientWidth || 1024;
    const h = this.container.clientHeight || 768;
    const aspect = w / h;
    const viewSize = 60;

    this.camera = new BABYLON.OrthographicCamera(
      'camera',
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      1000,
      this.scene
    );

    this.camera.position = new BABYLON.Vector3(15, 50, 25);
    this.camera.setTarget(BABYLON.Vector3.Zero());
  }

  setupLights() {
    const hemLight = new BABYLON.HemisphericLight('hemLight', new BABYLON.Vector3(0.5, 1, 0.5), this.scene);
    hemLight.intensity = 0.85;

    const pointLight = new BABYLON.PointLight('pointLight', new BABYLON.Vector3(30, 40, 30), this.scene);
    pointLight.intensity = 0.7;
    pointLight.range = 300;

    this.shadowGen = new BABYLON.ShadowGenerator(1024, pointLight);
    this.shadowGen.useBlurExponentialShadowMap = true;
  }

  buildHospital() {
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 300, height: 300 }, this.scene);
    ground.material = new BABYLON.StandardMaterial('gm', this.scene);
    ground.material.diffuse = new BABYLON.Color3(0.6, 0.78, 0.38);
    ground.receiveShadows = true;

    this.roomMeshes = new Map();

    ROOM_DEFS.forEach((pos, idx) => {
      const room = this.game.rooms[idx];
      const group = new BABYLON.TransformNode(`room${idx}`, this.scene);
      group.position.set(pos.x, 0, pos.z);

      const rc = room.color;
      const color = new BABYLON.Color3(((rc >> 16) & 255) / 255, ((rc >> 8) & 255) / 255, (rc & 255) / 255);

      // Floor
      const floor = BABYLON.MeshBuilder.CreateGround(`floor${idx}`, { width: ROOM_SIZE, height: ROOM_SIZE }, this.scene);
      floor.parent = group;
      floor.position.y = 0.01;
      floor.material = new BABYLON.StandardMaterial(`fm${idx}`, this.scene);
      floor.material.diffuse = new BABYLON.Color3(0.94, 0.94, 0.94);
      floor.receiveShadows = true;

      // Back wall
      const bwall = BABYLON.MeshBuilder.CreateBox(`bw${idx}`, { width: ROOM_SIZE, height: WALL_HEIGHT, depth: 0.8 }, this.scene);
      bwall.parent = group;
      bwall.position.z = -HALF;
      bwall.position.y = WALL_HEIGHT / 2;
      bwall.material = new BABYLON.StandardMaterial(`wm${idx}`, this.scene);
      bwall.material.diffuse = color;
      bwall.castShadow = true;
      bwall.receiveShadows = true;
      this.shadowGen.addShadowCaster(bwall);

      // Side wall
      const swall = BABYLON.MeshBuilder.CreateBox(`sw${idx}`, { width: 0.8, height: WALL_HEIGHT, depth: ROOM_SIZE }, this.scene);
      swall.parent = group;
      swall.position.x = -HALF;
      swall.position.y = WALL_HEIGHT / 2;
      swall.material = bwall.material;
      swall.castShadow = true;
      swall.receiveShadows = true;
      this.shadowGen.addShadowCaster(swall);

      // Make floor clickable
      floor.roomIdx = idx;
      floor.actionManager = new BABYLON.ActionManager(this.scene);
      floor.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger,
        () => {
          if (window.gameUI) {
            if (idx === 0) window.gameUI.showReception();
            else window.gameUI.showRoomDetail(idx);
          }
        }
      ));

      this.roomMeshes.set(idx, { group, floor });
    });
  }

  syncStaff() {
    const all = [];
    Object.entries(this.game.staffByTier).forEach(([tier, list]) => {
      list.forEach(s => all.push({ ...s, tier }));
    });

    for (const [id, m] of this.staffMeshes) {
      if (!all.find(s => s.id === id)) {
        m.dispose();
        this.staffMeshes.delete(id);
      }
    }

    all.forEach((s, i) => {
      if (!this.staffMeshes.has(s.id)) {
        const m = this.makeChar(this.game.staffTiers[s.tier].color, 1);
        this.staffMeshes.set(s.id, m);
      }
      const m = this.staffMeshes.get(s.id);
      const rid = i % ROOM_DEFS.length;
      const rd = ROOM_DEFS[rid];
      m.position.set(rd.x + 5 + (i % 3) * 2.5, 0.8, rd.z + 5 + Math.floor(i / 3) * 2.5);
    });
  }

  syncPatients() {
    const qi = new Set(this.game.patientQueue.map(p => p.id));
    const ci = new Set(this.game.checkingInPatients.map(p => p.id));
    const ti = new Set(this.game.activeTreatments.map(t => t.patient.id));

    for (const [id, m] of this.patientMeshes) {
      if (!qi.has(id) && !ci.has(id) && !ti.has(id)) {
        m.dispose();
        this.patientMeshes.delete(id);
      }
    }

    this.game.patientQueue.slice(0, 12).forEach((p, i) => {
      if (!this.patientMeshes.has(p.id)) {
        this.patientMeshes.set(p.id, this.makeChar(p.color, 0.7));
      }
      const m = this.patientMeshes.get(p.id);
      const rd = ROOM_DEFS[0];
      m.position.set(rd.x - 11 + (i % 4) * 2.5, 0.8, rd.z + 8 + Math.floor(i / 4) * 2.5);
    });

    this.game.checkingInPatients.forEach((p, i) => {
      if (!this.patientMeshes.has(p.id)) {
        this.patientMeshes.set(p.id, this.makeChar(p.color, 0.7));
      }
      const m = this.patientMeshes.get(p.id);
      const rd = ROOM_DEFS[0];
      m.position.set(rd.x - 2 + i * 2, 0.8, rd.z - 7);
    });

    this.game.activeTreatments.forEach(({ patient: p, roomIdx: rid }) => {
      if (!this.patientMeshes.has(p.id)) {
        this.patientMeshes.set(p.id, this.makeChar(p.color, 0.7));
      }
      const m = this.patientMeshes.get(p.id);
      const rd = ROOM_DEFS[rid];
      m.position.set(rd.x + 3, 0.8, rd.z + 3);
    });
  }

  makeChar(hex, scale) {
    const g = new BABYLON.TransformNode('c', this.scene);
    const col = new BABYLON.Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

    const h = BABYLON.MeshBuilder.CreateSphere('h', { diameter: 0.4 * scale }, this.scene);
    h.parent = g;
    h.position.y = 1.1 * scale;
    h.material = new BABYLON.StandardMaterial('hm', this.scene);
    h.material.diffuse = new BABYLON.Color3(0.98, 0.8, 0.6);
    h.castShadow = true;

    const b = BABYLON.MeshBuilder.CreateCylinder('b', { diameter: 0.3 * scale, height: 0.7 * scale }, this.scene);
    b.parent = g;
    b.position.y = 0.45 * scale;
    b.material = new BABYLON.StandardMaterial('bm', this.scene);
    b.material.diffuse = col;
    b.castShadow = true;

    const l = BABYLON.MeshBuilder.CreateCylinder('l', { diameter: 0.2 * scale, height: 0.6 * scale }, this.scene);
    l.parent = g;
    l.position.y = 0.05 * scale;
    l.material = new BABYLON.StandardMaterial('lm', this.scene);
    l.material.diffuse = new BABYLON.Color3(0.15, 0.15, 0.15);
    l.castShadow = true;

    return g;
  }

  setupGameEvents() {
    this.game.on('patientAdded', () => {});
    this.game.on('staffHired', () => {});
  }

  animate() {
    this.engine.runRenderLoop(() => {
      this.syncStaff();
      this.syncPatients();
      this.scene.render();
    });
  }
}

window.BabylonRenderer = BabylonRenderer;
export default BabylonRenderer;

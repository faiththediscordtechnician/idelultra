import * as BABYLON from 'babylon';
import GameEngine from './gameEngine.js';

const ROOM_SIZE = 26;
const WALL_HEIGHT = 9;
const HALF = ROOM_SIZE / 2;
const GAP = 8;

const ROOM_DEFS = [
  { x: -(ROOM_SIZE + GAP), z: -(ROOM_SIZE + GAP) }, // Reception
  { x: 0, z: -(ROOM_SIZE + GAP) },                  // Exam
  { x: (ROOM_SIZE + GAP), z: -(ROOM_SIZE + GAP) },  // Surgery
  { x: -(ROOM_SIZE + GAP), z: 0 },                  // ICU
  { x: 0, z: 0 },                                   // Pharmacy
  { x: (ROOM_SIZE + GAP), z: 0 },                   // Lab
];

class BabylonRenderer {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.selectedRoomIdx = null;
    this.staffMeshes = new Map();
    this.patientMeshes = new Map();

    // Create engine and scene
    this.engine = new BABYLON.Engine(container, true);
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color3(0.04, 0.09, 0.11);

    // Setup camera
    this.setupCamera();

    // Setup lighting
    this.setupLights();

    // Build the hospital
    this.buildHospital();

    // Setup interactions
    this.setupPointerEvents();

    // Setup game events
    this.setupGameEvents();

    // Start render loop
    this.animate();

    // Handle window resize
    window.addEventListener('resize', () => this.engine.resize());
  }

  setupCamera() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;
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

    this.camera.position = new BABYLON.Vector3(0, 40, 30);
    this.camera.setTarget(BABYLON.Vector3.Zero());

    // Orthographic view for isometric look
    this.camera.inertia = 0.8;
    this.camera.angularSensibility = 100;
  }

  setupLights() {
    const light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0.5, 1, 0.5), this.scene);
    light1.intensity = 0.8;

    const light2 = new BABYLON.PointLight('light2', new BABYLON.Vector3(20, 30, 20), this.scene);
    light2.intensity = 0.6;

    const shadowGenerator = new BABYLON.ShadowGenerator(1024, light2);
    shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator = shadowGenerator;
  }

  buildHospital() {
    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 200, height: 200 }, this.scene);
    ground.material = new BABYLON.StandardMaterial('groundMat', this.scene);
    ground.material.diffuse = new BABYLON.Color3(0.61, 0.8, 0.39);
    ground.receiveShadows = true;

    // Build each room
    this.roomMeshes = new Map();
    ROOM_DEFS.forEach((pos, idx) => {
      const room = this.game.rooms[idx];
      const group = new BABYLON.TransformNode(`room-${idx}`, this.scene);
      group.position = new BABYLON.Vector3(pos.x, 0, pos.z);

      // Convert hex color to BABYLON.Color3
      const colorNum = room.color;
      const r = ((colorNum >> 16) & 255) / 255;
      const g = ((colorNum >> 8) & 255) / 255;
      const b = (colorNum & 255) / 255;
      const color = new BABYLON.Color3(r, g, b);

      // Floor
      const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: ROOM_SIZE, height: ROOM_SIZE }, this.scene);
      floor.parent = group;
      floor.material = new BABYLON.StandardMaterial('floorMat', this.scene);
      floor.material.diffuse = new BABYLON.Color3(0.95, 0.95, 0.95);
      floor.receiveShadows = true;
      floor.position.y = 0.05;

      // Back wall
      const backWall = BABYLON.MeshBuilder.CreateBox('backWall', { width: ROOM_SIZE, height: WALL_HEIGHT, depth: 0.6 }, this.scene);
      backWall.parent = group;
      backWall.position.z = -HALF;
      backWall.position.y = WALL_HEIGHT / 2;
      backWall.material = new BABYLON.StandardMaterial('wallMat', this.scene);
      backWall.material.diffuse = color;
      backWall.material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
      backWall.castShadow = true;
      backWall.receiveShadows = true;

      // Side wall
      const sideWall = BABYLON.MeshBuilder.CreateBox('sideWall', { width: 0.6, height: WALL_HEIGHT, depth: ROOM_SIZE }, this.scene);
      sideWall.parent = group;
      sideWall.position.x = -HALF;
      sideWall.position.y = WALL_HEIGHT / 2;
      sideWall.material = backWall.material;
      sideWall.castShadow = true;
      sideWall.receiveShadows = true;

      // Room label
      const labelPlane = BABYLON.MeshBuilder.CreatePlane('label', { size: 8 }, this.scene);
      labelPlane.parent = group;
      labelPlane.position.set(0, 0.5, HALF - 1);
      labelPlane.rotation.x = Math.PI / 2;

      const labelMat = new BABYLON.StandardMaterial('labelMat', this.scene);
      const labelTexture = new BABYLON.DynamicTexture('labelTexture', 256);
      const ctx = labelTexture.getContext();
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#333';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.name.substring(0, 3), 128, 128);
      labelTexture.update();

      labelMat.emissiveTexture = labelTexture;
      labelMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
      labelPlane.material = labelMat;

      // Make the room clickable
      floor.roomIdx = idx;
      floor.actionManager = new BABYLON.ActionManager(this.scene);
      floor.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger,
        () => {
          if (window.gameUI) {
            if (idx === 0) {
              window.gameUI.showReception();
            } else {
              window.gameUI.showRoomDetail(idx);
            }
          }
        }
      ));

      this.roomMeshes.set(idx, { group, floor, backWall, sideWall, color });
    });
  }

  setupPointerEvents() {
    // Enable pointer events
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        // Pointer down handling if needed
      }
    });
  }

  syncStaff() {
    const allStaff = [];
    Object.entries(this.game.staffByTier).forEach(([tier, list]) => {
      list.forEach(s => allStaff.push({ ...s, tier }));
    });

    // Clean up removed staff
    for (const [id, mesh] of this.staffMeshes) {
      if (!allStaff.find(s => s.id === id)) {
        mesh.dispose();
        this.staffMeshes.delete(id);
      }
    }

    // Create/update staff meshes
    allStaff.forEach((staff, idx) => {
      if (!this.staffMeshes.has(staff.id)) {
        const color = this.game.staffTiers[staff.tier].color;
        const mesh = this.createCharacterMesh(color, 1.0);
        mesh.name = `staff-${staff.id}`;
        this.staffMeshes.set(staff.id, mesh);
      }

      const mesh = this.staffMeshes.get(staff.id);
      const roomIdx = idx % ROOM_DEFS.length;
      const roomDef = ROOM_DEFS[roomIdx];
      mesh.position.set(roomDef.x + 5 + (idx % 3) * 3, 0.5, roomDef.z + 5 + Math.floor(idx / 3) * 3);
    });
  }

  syncPatients() {
    // Get all patient IDs
    const queueIds = new Set(this.game.patientQueue.map(p => p.id));
    const checkinIds = new Set(this.game.checkingInPatients.map(p => p.id));
    const treatingIds = new Set(this.game.activeTreatments.map(t => t.patient.id));

    // Clean up removed patients
    for (const [id, mesh] of this.patientMeshes) {
      if (!queueIds.has(id) && !checkinIds.has(id) && !treatingIds.has(id)) {
        mesh.dispose();
        this.patientMeshes.delete(id);
      }
    }

    // Queue patients (outside reception)
    this.game.patientQueue.slice(0, 12).forEach((patient, idx) => {
      if (!this.patientMeshes.has(patient.id)) {
        const mesh = this.createCharacterMesh(patient.color, 0.8);
        mesh.name = `patient-${patient.id}`;
        this.patientMeshes.set(patient.id, mesh);
      }

      const mesh = this.patientMeshes.get(patient.id);
      const recDef = ROOM_DEFS[0];
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      mesh.position.set(recDef.x - 10 + col * 3, 0.5, recDef.z + 8 + row * 3);
    });

    // Check-in patients
    this.game.checkingInPatients.forEach((patient, idx) => {
      if (!this.patientMeshes.has(patient.id)) {
        const mesh = this.createCharacterMesh(patient.color, 0.8);
        mesh.name = `checkin-${patient.id}`;
        this.patientMeshes.set(patient.id, mesh);
      }

      const mesh = this.patientMeshes.get(patient.id);
      const recDef = ROOM_DEFS[0];
      mesh.position.set(recDef.x - 2 + idx * 2, 0.5, recDef.z - 5);
    });

    // Treating patients
    this.game.activeTreatments.forEach(({ patient, staff, roomIdx }) => {
      if (!this.patientMeshes.has(patient.id)) {
        const mesh = this.createCharacterMesh(patient.color, 0.8);
        mesh.name = `treating-${patient.id}`;
        this.patientMeshes.set(patient.id, mesh);
      }

      const mesh = this.patientMeshes.get(patient.id);
      const roomDef = ROOM_DEFS[roomIdx];
      mesh.position.set(roomDef.x + 3, 0.5, roomDef.z + 3);
    });
  }

  createCharacterMesh(hexColor, scale) {
    const group = new BABYLON.TransformNode('character', this.scene);

    // Convert hex to BABYLON.Color3
    const r = ((hexColor >> 16) & 255) / 255;
    const g = ((hexColor >> 8) & 255) / 255;
    const b = (hexColor & 255) / 255;
    const color = new BABYLON.Color3(r, g, b);

    // Head
    const head = BABYLON.MeshBuilder.CreateSphere('head', { diameter: 0.5 * scale, segments: 16 }, this.scene);
    head.parent = group;
    head.position.y = 1.2 * scale;
    head.material = new BABYLON.StandardMaterial('headMat', this.scene);
    head.material.diffuse = new BABYLON.Color3(1, 0.8, 0.7);
    head.castShadow = true;

    // Hair
    const hair = BABYLON.MeshBuilder.CreateSphere('hair', { diameter: 0.6 * scale, segments: 16 }, this.scene);
    hair.parent = group;
    hair.position.y = 1.4 * scale;
    hair.scaling.y = 0.7;
    hair.material = new BABYLON.StandardMaterial('hairMat', this.scene);
    hair.material.diffuse = new BABYLON.Color3(0.2, 0.2, 0.2);
    hair.castShadow = true;

    // Body
    const body = BABYLON.MeshBuilder.CreateBox('body', { width: 0.3 * scale, height: 0.8 * scale, depth: 0.3 * scale }, this.scene);
    body.parent = group;
    body.position.y = 0.5 * scale;
    body.material = new BABYLON.StandardMaterial('bodyMat', this.scene);
    body.material.diffuse = color;
    body.castShadow = true;

    // Legs
    const legs = BABYLON.MeshBuilder.CreateBox('legs', { width: 0.3 * scale, height: 0.6 * scale, depth: 0.3 * scale }, this.scene);
    legs.parent = group;
    legs.position.y = 0.1 * scale;
    legs.material = new BABYLON.StandardMaterial('legsMat', this.scene);
    legs.material.diffuse = new BABYLON.Color3(0.3, 0.3, 0.3);
    legs.castShadow = true;

    return group;
  }

  setupGameEvents() {
    this.game.on('patientAdded', () => { /* auto-sync */ });
    this.game.on('staffHired', () => { /* auto-sync */ });
    this.game.on('treatmentStarted', () => { /* auto-sync */ });
    this.game.on('treatmentCompleted', () => { /* auto-sync */ });
  }

  animate() {
    this.engine.runRenderLoop(() => {
      // Update meshes
      this.syncStaff();
      this.syncPatients();

      // Render scene
      this.scene.render();
    });
  }

  dispose() {
    this.engine.dispose();
  }
}

// Export for use
window.BabylonRenderer = BabylonRenderer;
export default BabylonRenderer;

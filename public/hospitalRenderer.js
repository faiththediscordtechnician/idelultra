import * as THREE from 'three';

// Static fallback colors so visuals never depend on save-data integrity
const ROOM_COLORS = [0x4CAF50, 0x2196F3, 0xFF6B6B, 0xFF9800, 0x9C27B0, 0x00BCD4];
const ROOM_TYPES = ['reception', 'examination', 'surgery', 'icu', 'pharmacy', 'lab'];

const ROOM_SIZE = 26;
const HALF = ROOM_SIZE / 2;
const WALL_HEIGHT = 9;
const WALL_THICK = 0.6;
const GAP = 8; // corridor / partition gap between room cells

const ROOM_DEFS = [
  { x: -(ROOM_SIZE + GAP), z: -(ROOM_SIZE + GAP) }, // Reception
  { x: 0, z: -(ROOM_SIZE + GAP) },                  // Examination
  { x: (ROOM_SIZE + GAP), z: -(ROOM_SIZE + GAP) },  // Surgery
  { x: -(ROOM_SIZE + GAP), z: 0 },                  // ICU
  { x: 0, z: 0 },                                   // Pharmacy
  { x: (ROOM_SIZE + GAP), z: 0 },                   // Lab
];

const NEUTRAL_WALL = 0xfdfaf3;
const SKIN_TONES = [0xffd9b3, 0xe8b894, 0xc88a5c, 0xf5c9a0];
const STAFF_HAIR = 0x3e2723;

function makeTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#eef2f7';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillRect(32, 32, 32, 32);
  ctx.strokeStyle = '#d4dce6';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function makeBadgeTexture(num, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), 64, 70);
  return new THREE.CanvasTexture(canvas);
}

function makePictureTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 96);
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.fillRect(10, 10, 108, 76);
  return new THREE.CanvasTexture(canvas);
}

export class HospitalRenderer {
  constructor(container, game) {
    this.game = game;
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcfeaff);
    this.scene.fog = new THREE.Fog(0xcfeaff, 180, 380);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;

    // True isometric orthographic camera (no perspective distortion)
    this.viewSize = 65;
    this.isoDir = new THREE.Vector3(1, 1, 1).normalize();
    this.cameraDistance = 220;
    this.cameraTarget = new THREE.Vector3(0, 0, -15);
    this.currentTarget = this.cameraTarget.clone();

    this.camera = new THREE.OrthographicCamera(
      -this.viewSize * aspect, this.viewSize * aspect,
      this.viewSize, -this.viewSize,
      1, 800
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.roomMeshes = new Map();
    this.staffMeshes = new Map();
    this.patientMeshes = new Map();
    this.particleSystem = new ParticleSystem(this.scene);

    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;

    this.setupCameraControls();
    this.buildHospital();
    this.setupGameEvents();

    window.addEventListener('resize', () => this.onWindowResize());

    this.animate();

    console.log('🏥 Hospital Renderer initialized — rooms:', this.roomMeshes.size, 'scene children:', this.scene.children.length);
  }

  updateCameraPosition() {
    this.camera.position.copy(this.currentTarget).addScaledVector(this.isoDir, this.cameraDistance);
    this.camera.lookAt(this.currentTarget);
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    this.mainLight = new THREE.DirectionalLight(0xfff4e0, 1.15);
    this.mainLight.position.set(70, 100, 50);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.set(2048, 2048);
    this.mainLight.shadow.camera.left = -100;
    this.mainLight.shadow.camera.right = 100;
    this.mainLight.shadow.camera.top = 100;
    this.mainLight.shadow.camera.bottom = -100;
    this.mainLight.shadow.camera.far = 300;
    this.scene.add(this.mainLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xddeeff, 0.55);
    this.scene.add(hemiLight);
  }

  setupCameraControls() {
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.prevMouse = { x: e.clientX, y: e.clientY };

      const panScale = (this.viewSize / 65) * 0.22;
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      this.cameraTarget.addScaledVector(right, -dx * panScale);
      this.cameraTarget.addScaledVector(forward, dy * panScale);
      this.cameraTarget.x = Math.max(-90, Math.min(90, this.cameraTarget.x));
      this.cameraTarget.z = Math.max(-90, Math.min(60, this.cameraTarget.z));
    });

    this.renderer.domElement.addEventListener('mouseup', () => { this.isDragging = false; });
    this.renderer.domElement.addEventListener('mouseleave', () => { this.isDragging = false; });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.viewSize += e.deltaY * 0.03;
      this.viewSize = Math.max(28, Math.min(110, this.viewSize));
      this.applyViewSize();
    });
  }

  applyViewSize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / height;
    this.camera.left = -this.viewSize * aspect;
    this.camera.right = this.viewSize * aspect;
    this.camera.top = this.viewSize;
    this.camera.bottom = -this.viewSize;
    this.camera.updateProjectionMatrix();
  }

  buildHospital() {
    // Exterior grass for atmosphere
    const grassGeo = new THREE.PlaneGeometry(400, 400);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x9ccc65, roughness: 1 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.08;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // Shared interior floor — one continuous tiled slab, not separate colored tiles
    const minX = -(ROOM_SIZE + GAP) - HALF - 6;
    const maxX = (ROOM_SIZE + GAP) + HALF + 6;
    const minZ = -(ROOM_SIZE + GAP) - HALF - 6;
    const maxZ = HALF + 14;
    const floorW = maxX - minX;
    const floorD = maxZ - minZ;
    const floorCenterX = (minX + maxX) / 2;
    const floorCenterZ = (minZ + maxZ) / 2;

    const tileTexture = makeTileTexture();
    tileTexture.repeat.set(floorW / 6, floorD / 6);
    const floorMat = new THREE.MeshStandardMaterial({ map: tileTexture, roughness: 0.85 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(floorW, 1, floorD), floorMat);
    floor.position.set(floorCenterX, -0.5, floorCenterZ);
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.decorateCourtyard();
    this.createRooms();
  }

  decorateCourtyard() {
    const tree = (x, z) => {
      const group = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.9, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 })
      );
      trunk.position.y = 2.5;
      trunk.castShadow = true;
      group.add(trunk);
      [0, 1, 2].forEach((i) => {
        const foliage = new THREE.Mesh(
          new THREE.SphereGeometry(2.6 - i * 0.4, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.8 })
        );
        foliage.position.y = 5.5 + i * 1.6;
        foliage.castShadow = true;
        group.add(foliage);
      });
      group.position.set(x, 0, z);
      this.scene.add(group);
    };
    tree(-70, -50);
    tree(75, -10);
    tree(-65, 30);
  }

  createRooms() {
    ROOM_DEFS.forEach((pos, idx) => {
      const room = (this.game.rooms && this.game.rooms[idx]) || {};
      const color = room.color || ROOM_COLORS[idx] || 0x888888;
      const name = room.name || ROOM_TYPES[idx];
      const type = room.type || ROOM_TYPES[idx];

      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      // Back wall (accent colored) and side wall (neutral partition) — the other
      // two sides stay open so the iso camera can see straight into the room,
      // dollhouse-style, the way isometric management games render interiors.
      const accentMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      const neutralMat = new THREE.MeshStandardMaterial({ color: NEUTRAL_WALL, roughness: 0.85 });

      const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, WALL_HEIGHT, WALL_THICK), accentMat);
      backWall.position.set(0, WALL_HEIGHT / 2, -HALF);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      group.add(backWall);

      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, WALL_HEIGHT, ROOM_SIZE), neutralMat);
      sideWall.position.set(-HALF, WALL_HEIGHT / 2, 0);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      group.add(sideWall);

      // Picture frame decoration on the back wall
      const pictureTex = makePictureTexture(color);
      const picture = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 3),
        new THREE.MeshStandardMaterial({ map: pictureTex })
      );
      picture.position.set(HALF * 0.45, WALL_HEIGHT * 0.62, -HALF + WALL_THICK / 2 + 0.02);
      group.add(picture);

      // Room number badge mounted near the corner
      const badgeTex = makeBadgeTexture(idx + 1, color);
      const badge = new THREE.Mesh(
        new THREE.CircleGeometry(1.6, 24),
        new THREE.MeshStandardMaterial({ map: badgeTex, transparent: true })
      );
      badge.position.set(-HALF * 0.7, WALL_HEIGHT * 0.78, -HALF + WALL_THICK / 2 + 0.02);
      group.add(badge);

      // Floor name label
      const nameCanvas = document.createElement('canvas');
      nameCanvas.width = 256;
      nameCanvas.height = 64;
      const nctx = nameCanvas.getContext('2d');
      nctx.fillStyle = 'rgba(255,255,255,0.85)';
      nctx.fillRect(0, 0, 256, 64);
      nctx.fillStyle = '#333';
      nctx.font = 'bold 26px Arial';
      nctx.textAlign = 'center';
      nctx.textBaseline = 'middle';
      nctx.fillText(name, 128, 32);
      const nameTex = new THREE.CanvasTexture(nameCanvas);
      const nameSign = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 2.2),
        new THREE.MeshStandardMaterial({ map: nameTex, transparent: true })
      );
      nameSign.rotation.x = -Math.PI / 2;
      nameSign.position.set(0, 0.05, HALF - 2);
      group.add(nameSign);

      const furnitureGroup = this.buildFurniture(type, color);
      group.add(furnitureGroup);

      this.scene.add(group);
      this.roomMeshes.set(idx, { group, backWall, badge, furnitureGroup, color, type });
      this.applyRoomLevel(idx, room.level || 1);
    });
  }

  buildFurniture(type, color) {
    const group = new THREE.Group();
    const wood = 0x8d6e63;
    const metal = 0xb0bec5;

    const addBox = (w, h, d, c, x, y, z, parent = group) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const addCylinder = (r1, r2, h, c, x, y, z, parent = group) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 10), new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };

    switch (type) {
      case 'reception': {
        addBox(11, 3, 4, wood, 0, 1.5, -HALF + 6);
        addBox(1.6, 1.6, 0.2, 0x37474f, 0, 3.6, -HALF + 5);
        addBox(2, 1, 2, 0x4dd0e1, -7, 0.5, HALF - 6);
        addBox(2, 1.8, 0.4, 0x4dd0e1, -7, 1.4, HALF - 7);
        addBox(2, 1, 2, 0xff8a65, 6, 0.5, HALF - 6);
        addBox(2, 1.8, 0.4, 0xff8a65, 6, 1.4, HALF - 7);
        addCylinder(0.4, 0.5, 4, wood, -HALF + 3, 2, -HALF + 3);
        addCylinder(1.6, 0, 2.4, 0x66bb6a, -HALF + 3, 5, -HALF + 3);
        break;
      }
      case 'examination': {
        addBox(6.5, 1.8, 3.2, 0xffffff, 0, 0.9, -2);
        addBox(6.5, 0.6, 3.2, 0x42a5f5, 0, 1.9, -2);
        addBox(1.8, 1.8, 1.8, metal, HALF - 4, 0.9, HALF - 4);
        addBox(1.2, 0.2, 1.2, 0xffffff, HALF - 4, 1.9, HALF - 4);
        addBox(1.8, 1, 1.8, 0x90a4ae, -HALF + 4, 0.5, HALF - 4);
        break;
      }
      case 'surgery': {
        addBox(8, 1.4, 4, 0xeceff1, 0, 1.6, -3);
        [[-3.5, -4.5], [3.5, -4.5], [-3.5, -1.5], [3.5, -1.5]].forEach(([x, z]) => {
          addCylinder(0.25, 0.25, 1.6, metal, x, 0.8, z);
        });
        addCylinder(0.2, 0.2, 6, metal, 0, 6, -3);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfff59d, emissive: 0xfff59d, emissiveIntensity: 0.6 }));
        lamp.position.set(0, 8.6, -3);
        group.add(lamp);
        addBox(2, 2.4, 1.6, metal, HALF - 4, 1.2, HALF - 5);
        break;
      }
      case 'icu': {
        addBox(6.5, 1.8, 3.2, 0xffffff, 0, 0.9, -2);
        addBox(6.5, 0.6, 3.2, 0x29b6f6, 0, 1.9, -2);
        addBox(0.3, 2.4, 1.6, 0x263238, HALF - 5, 1.2, -2);
        addBox(1.4, 1, 0.2, 0x4caf50, HALF - 5, 2.6, -1.3);
        addBox(2, 1, 2, 0x90caf9, -HALF + 4, 0.5, HALF - 5);
        break;
      }
      case 'pharmacy': {
        [0, 1, 2].forEach((i) => {
          addBox(8, 0.3, 1.4, wood, 0, 1.2 + i * 1.8, -HALF + 1.4);
        });
        for (let i = 0; i < 6; i++) {
          const bottleColor = [0x4dd0e1, 0xf06292, 0xffd54f, 0x81c784][i % 4];
          addBox(0.5, 1, 0.5, bottleColor, -3.5 + i * 1.3, 1.9, -HALF + 1.4);
        }
        addBox(7, 2.6, 3, wood, HALF - 5, 1.3, HALF - 5);
        break;
      }
      case 'lab': {
        addBox(9, 1.6, 3, metal, 0, 1.4, -HALF + 5);
        for (let i = 0; i < 4; i++) {
          addCylinder(0.3, 0.3, 1.4, 0x4dd0e1, -3 + i * 2, 2.9, -HALF + 5);
        }
        addCylinder(0.5, 0.5, 1.4, 0x90a4ae, HALF - 4, 0.7, HALF - 4);
        addCylinder(0.55, 0.55, 0.15, 0xcfd8dc, HALF - 4, 1.45, HALF - 4);
        break;
      }
      default:
        break;
    }
    return group;
  }

  applyRoomLevel(idx, level) {
    const ref = this.roomMeshes.get(idx);
    if (!ref) return;
    const scale = 1 + Math.min(level - 1, 10) * 0.015;
    ref.furnitureGroup.scale.setScalar(scale);
    ref.badge.scale.setScalar(1 + Math.min(level - 1, 10) * 0.03);
  }

  setupGameEvents() {
    this.game.on('patientServed', (patient) => {
      const recDef = ROOM_DEFS[0];
      this.particleSystem.burst(patient.color || 0x4CAF50, 10, new THREE.Vector3(recDef.x, 8, recDef.z));
    });

    this.game.on('staffHired', ({ tier }) => {
      const color = (this.game.staffTiers[tier] && this.game.staffTiers[tier].color) || 0x90caf9;
      this.particleSystem.burst(color, 15);
    });

    this.game.on('roomBought', ({ room }) => {
      this.particleSystem.burst(room.color || 0x4CAF50, 18);
    });

    this.game.on('roomUpgraded', ({ room }) => {
      const idx = this.game.rooms.indexOf(room);
      if (idx >= 0) this.applyRoomLevel(idx, room.level);
      this.particleSystem.burst(room.color || 0x4CAF50, 12);
    });

    this.game.on('missionCompleted', () => {
      this.particleSystem.burstConfetti(30);
    });

    this.game.on('prestigeGained', () => {
      this.particleSystem.burstConfetti(50, new THREE.Vector3(0, 15, 0));
      this.triggerShake(0.6, 2.5);
    });
  }

  triggerShake(duration, strength) {
    this.shakeTime = duration;
    this.shakeDuration = duration;
    this.shakeStrength = strength;
  }

  createCharacter(color, scale = 1) {
    const group = new THREE.Group();
    const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.55 * scale, 14, 14),
      new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 })
    );
    head.position.y = 1.75 * scale;
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.58 * scale, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: STAFF_HAIR, roughness: 0.8 })
    );
    hair.position.y = 1.95 * scale;
    group.add(hair);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [-0.2, 0.2].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 6, 6), eyeMat);
      eye.position.set(ex * scale, 1.75 * scale, 0.5 * scale);
      group.add(eye);
    });

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42 * scale, 0.5 * scale, 1.1 * scale, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    );
    body.position.y = 0.9 * scale;
    body.castShadow = true;
    group.add(body);

    [-0.45, 0.45].forEach((lx) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.7 * scale, 8),
        new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.8 })
      );
      leg.position.set(lx * scale, 0.35 * scale, 0);
      leg.castShadow = true;
      group.add(leg);
    });

    group.userData.phase = Math.random() * Math.PI * 2;
    return group;
  }

  syncStaff() {
    const allStaff = [];
    Object.entries(this.game.staffByTier).forEach(([tier, list]) => {
      list.forEach((s) => allStaff.push({ ...s, tier }));
    });

    for (const [id, mesh] of this.staffMeshes) {
      if (!allStaff.find((s) => s.id === id)) {
        this.scene.remove(mesh);
        this.staffMeshes.delete(id);
      }
    }

    const perRoom = new Map();
    allStaff.forEach((staff, idx) => {
      let mesh = this.staffMeshes.get(staff.id);
      const roomIdx = idx % ROOM_DEFS.length;
      const slot = perRoom.get(roomIdx) || 0;
      perRoom.set(roomIdx, slot + 1);

      if (!mesh) {
        const color = (this.game.staffTiers[staff.tier] && this.game.staffTiers[staff.tier].color) || 0x90caf9;
        mesh = this.createCharacter(color, 0.95);
        this.scene.add(mesh);
        this.staffMeshes.set(staff.id, mesh);
      }

      const roomPos = ROOM_DEFS[roomIdx];
      const col = slot % 3;
      const row = Math.floor(slot / 3);
      mesh.position.set(
        roomPos.x + 2 + col * 4,
        0,
        roomPos.z + 4 + row * 4
      );
    });
  }

  syncPatients() {
    const currentIds = new Set(this.game.patientQueue.map((p) => p.id));
    for (const [id, mesh] of this.patientMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.patientMeshes.delete(id);
      }
    }

    const recDef = ROOM_DEFS[0];
    this.game.patientQueue.slice(0, 12).forEach((patient, idx) => {
      let mesh = this.patientMeshes.get(patient.id);
      if (!mesh) {
        mesh = this.createCharacter(patient.color || 0x4CAF50, 0.85);
        this.scene.add(mesh);
        this.patientMeshes.set(patient.id, mesh);
      }
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      mesh.position.set(recDef.x - 6 + col * 4, 0, recDef.z + HALF + 6 + row * 4);
    });
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.getElapsedTime();

    this.syncStaff();
    this.syncPatients();

    const bob = (mesh) => {
      mesh.position.y = Math.sin(t * 2 + mesh.userData.phase) * 0.08;
      mesh.rotation.y = Math.sin(t * 0.4 + mesh.userData.phase) * 0.3;
    };
    this.staffMeshes.forEach(bob);
    this.patientMeshes.forEach(bob);

    this.currentTarget.lerp(this.cameraTarget, 0.12);
    this.updateCameraPosition();

    if (this.shakeTime > 0) {
      const f = this.shakeTime / this.shakeDuration;
      this.camera.position.x += (Math.random() - 0.5) * this.shakeStrength * f;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeStrength * f;
      this.shakeTime -= deltaTime;
    }

    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  onWindowResize() {
    this.applyViewSize();
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  dispose() {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.pool = [];
  }

  burst(color, count, position = new THREE.Vector3(0, 12, 0)) {
    for (let i = 0; i < count; i++) {
      const particle = this.pool.pop() || new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, transparent: true })
      );
      particle.position.copy(position);
      particle.material.color.setHex(color);
      particle.material.emissive.setHex(color);
      particle.material.opacity = 1;

      const angle = (Math.PI * 2 * i) / count;
      const speed = 3 + Math.random() * 2;
      particle.velocity = new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 2, Math.sin(angle) * speed);
      particle.life = 1.2;
      particle.maxLife = 1.2;

      this.particles.push(particle);
      this.scene.add(particle);
    }
  }

  burstConfetti(count, position = new THREE.Vector3(0, 12, 0)) {
    const palette = [0xffd700, 0xff6b6b, 0x4caf50, 0x2196f3, 0xff9800, 0xe91e63];
    for (let i = 0; i < count; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const particle = this.pool.pop() || new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.05),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true })
      );
      particle.position.copy(position);
      particle.material.color.setHex(color);
      particle.material.emissive.setHex(color);
      particle.material.opacity = 1;

      particle.velocity = new THREE.Vector3((Math.random() - 0.5) * 8, 5 + Math.random() * 4, (Math.random() - 0.5) * 8);
      particle.life = 2;
      particle.maxLife = 2;
      particle.spin = (Math.random() - 0.5) * 10;

      this.particles.push(particle);
      this.scene.add(particle);
    }
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p);
        this.particles.splice(i, 1);
        this.pool.push(p);
        continue;
      }

      p.velocity.y -= 9.8 * deltaTime;
      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      if (p.spin) p.rotation.x += p.spin * deltaTime;

      const alpha = p.life / p.maxLife;
      p.material.opacity = alpha;
      p.scale.setScalar(alpha);
    }
  }
}

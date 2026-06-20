import GameEngine from './gameEngine.js';

const THREE = window.THREE;

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

class HospitalRenderer {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.roomMeshes = new Map();
    this.staffMeshes = new Map();
    this.patientMeshes = new Map();
    this.selectedRoom = null;

    // Three.js setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);

    const w = container.clientWidth;
    const h = container.clientHeight;
    const aspect = w / h;
    const viewSize = 60;

    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      1000
    );
    this.camera.position.set(10, 50, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const hemLight = new THREE.HemisphericLight(0xffffff, 0x444444, 0.8);
    this.scene.add(hemLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(30, 40, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);
    this.shadowLight = dirLight;

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x609d3f })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Build rooms
    this.buildRooms();
    this.setupClicking();

    // Render loop
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  buildRooms() {
    ROOM_DEFS.forEach((pos, idx) => {
      const room = this.game.rooms[idx];
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      this.scene.add(group);

      const color = new THREE.Color(room.color);

      // Floor
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
        new THREE.MeshStandardMaterial({ color: 0xf0f0f0 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.01;
      floor.receiveShadow = true;
      group.add(floor);

      // Back wall
      const bwall = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_SIZE, WALL_HEIGHT, 0.8),
        new THREE.MeshStandardMaterial({ color })
      );
      bwall.position.z = -HALF;
      bwall.position.y = WALL_HEIGHT / 2;
      bwall.castShadow = true;
      bwall.receiveShadow = true;
      group.add(bwall);

      // Side wall
      const swall = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, WALL_HEIGHT, ROOM_SIZE),
        new THREE.MeshStandardMaterial({ color })
      );
      swall.position.x = -HALF;
      swall.position.y = WALL_HEIGHT / 2;
      swall.castShadow = true;
      swall.receiveShadow = true;
      group.add(swall);

      // Store for clicking
      floor.roomIdx = idx;
      floor.isClickable = true;
      this.roomMeshes.set(idx, { group, floor });
    });
  }

  setupClicking() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('click', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const clickables = Array.from(this.roomMeshes.values()).map(r => r.floor);
      const hits = this.raycaster.intersectObjects(clickables);

      if (hits.length > 0) {
        const idx = hits[0].object.roomIdx;
        if (window.gameUI) {
          if (idx === 0) {
            window.gameUI.showReception();
          } else {
            window.gameUI.showRoomDetail(idx);
          }
        }
      }
    });
  }

  syncStaff() {
    const all = [];
    Object.entries(this.game.staffByTier).forEach(([tier, list]) => {
      list.forEach(s => all.push({ ...s, tier }));
    });

    for (const [id, mesh] of this.staffMeshes) {
      if (!all.find(s => s.id === id)) {
        this.scene.remove(mesh);
        this.staffMeshes.delete(id);
      }
    }

    all.forEach((s, i) => {
      if (!this.staffMeshes.has(s.id)) {
        const col = this.game.staffTiers[s.tier].color;
        const m = this.createChar(col, 1);
        this.scene.add(m);
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
        this.scene.remove(m);
        this.patientMeshes.delete(id);
      }
    }

    this.game.patientQueue.slice(0, 12).forEach((p, i) => {
      if (!this.patientMeshes.has(p.id)) {
        const m = this.createChar(p.color, 0.7);
        this.scene.add(m);
        this.patientMeshes.set(p.id, m);
      }
      const m = this.patientMeshes.get(p.id);
      const rd = ROOM_DEFS[0];
      m.position.set(rd.x - 11 + (i % 4) * 2.5, 0.8, rd.z + 8 + Math.floor(i / 4) * 2.5);
    });

    this.game.checkingInPatients.forEach((p, i) => {
      if (!this.patientMeshes.has(p.id)) {
        const m = this.createChar(p.color, 0.7);
        this.scene.add(m);
        this.patientMeshes.set(p.id, m);
      }
      const m = this.patientMeshes.get(p.id);
      const rd = ROOM_DEFS[0];
      m.position.set(rd.x - 2 + i * 2, 0.8, rd.z - 7);
    });

    this.game.activeTreatments.forEach(({ patient: p, roomIdx: rid }) => {
      if (!this.patientMeshes.has(p.id)) {
        const m = this.createChar(p.color, 0.7);
        this.scene.add(m);
        this.patientMeshes.set(p.id, m);
      }
      const m = this.patientMeshes.get(p.id);
      const rd = ROOM_DEFS[rid];
      m.position.set(rd.x + 3, 0.8, rd.z + 3);
    });
  }

  createChar(hexCol, scale) {
    const g = new THREE.Group();
    const col = new THREE.Color(hexCol);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.4 * scale, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffc9a8 })
    );
    head.position.y = 1.1 * scale;
    head.castShadow = true;
    g.add(head);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 0.7 * scale, 12),
      new THREE.MeshStandardMaterial({ color: col })
    );
    body.position.y = 0.45 * scale;
    body.castShadow = true;
    g.add(body);

    const legs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 0.6 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    legs.position.y = 0.05 * scale;
    legs.castShadow = true;
    g.add(legs);

    return g;
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    this.syncStaff();
    this.syncPatients();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const aspect = w / h;
    const viewSize = 60;

    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
  }
}

window.HospitalRenderer = HospitalRenderer;
export default HospitalRenderer;

import * as THREE from 'three';

// Static fallback colors so visuals never depend on save-data integrity
const ROOM_COLORS = [0x4CAF50, 0x2196F3, 0xFF6B6B, 0xFF9800, 0x9C27B0, 0x00BCD4];
const ROOM_POSITIONS = [
  { x: -32, z: -32, name: 'Reception' },
  { x: 0, z: -32, name: 'Exam' },
  { x: 32, z: -32, name: 'Surgery' },
  { x: -32, z: 0, name: 'ICU' },
  { x: 0, z: 0, name: 'Pharmacy' },
  { x: 32, z: 0, name: 'Lab' },
];
const ROOM_SIZE = 22;

export class HospitalRenderer {
  constructor(container, game) {
    this.game = game;
    this.container = container;
    this.clock = new THREE.Clock();

    // Bright, clean "clinic management" look — not a dark sci-fi dashboard
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcfeaff);
    this.scene.fog = new THREE.Fog(0xcfeaff, 160, 320);

    // Isometric-style angled top-down camera, typical of management/idle games
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(55, 65, 55);
    this.camera.lookAt(0, 0, 0);

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

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    this.mainLight = new THREE.DirectionalLight(0xfff4e0, 1.1);
    this.mainLight.position.set(60, 90, 40);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.set(2048, 2048);
    this.mainLight.shadow.camera.left = -120;
    this.mainLight.shadow.camera.right = 120;
    this.mainLight.shadow.camera.top = 120;
    this.mainLight.shadow.camera.bottom = -120;
    this.mainLight.shadow.camera.far = 300;
    this.scene.add(this.mainLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xddeeff, 0.5);
    this.scene.add(hemiLight);
  }

  setupCameraControls() {
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };
    this.targetCameraPos = this.camera.position.clone();
    this.smoothSpeed = 0.12;

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = (e.clientX - this.prevMouse.x) * 0.15;
        const dy = (e.clientY - this.prevMouse.y) * 0.15;
        this.targetCameraPos.x -= dx;
        this.targetCameraPos.z -= dy;
        this.targetCameraPos.x = Math.max(-100, Math.min(100, this.targetCameraPos.x));
        this.targetCameraPos.z = Math.max(-100, Math.min(100, this.targetCameraPos.z));
        this.prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    this.renderer.domElement.addEventListener('mouseup', () => { this.isDragging = false; });
    this.renderer.domElement.addEventListener('mouseleave', () => { this.isDragging = false; });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetCameraPos.y += e.deltaY * 0.04;
      this.targetCameraPos.y = Math.max(35, Math.min(110, this.targetCameraPos.y));
    });
  }

  buildHospital() {
    const groundGeo = new THREE.PlaneGeometry(220, 220);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xeef7ee, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(220, 22, 0xb8d4c0, 0xd6e8da);
    gridHelper.position.y = 0.02;
    this.scene.add(gridHelper);

    this.createRooms();
  }

  createRooms() {
    ROOM_POSITIONS.forEach((pos, idx) => {
      const room = (this.game.rooms && this.game.rooms[idx]) || {};
      const color = room.color || ROOM_COLORS[idx] || 0x888888;
      const name = room.name || pos.name;

      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      const half = ROOM_SIZE / 2;

      // Floor
      const floorMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        emissive: color,
        emissiveIntensity: 0.05,
      });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, 0.5, ROOM_SIZE), floorMat);
      floor.position.y = 0.25;
      floor.castShadow = true;
      floor.receiveShadow = true;
      group.add(floor);

      // Low walls (knee-high, so the isometric view reads as a floor plan, not a closed box)
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
      const wallHeight = 4;

      const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, wallHeight, 0.4), wallMat);
      backWall.position.set(0, wallHeight / 2, -half);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      group.add(backWall);

      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallHeight, ROOM_SIZE), wallMat);
      leftWall.position.set(-half, wallHeight / 2, 0);
      leftWall.castShadow = true;
      leftWall.receiveShadow = true;
      group.add(leftWall);

      // Room sign with canvas label
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 128, 48);
      const texture = new THREE.CanvasTexture(canvas);
      const signMat = new THREE.MeshStandardMaterial({ map: texture });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 0.2), signMat);
      sign.position.set(0, wallHeight + 1.6, -half);
      sign.castShadow = true;
      group.add(sign);

      this.scene.add(group);
      this.roomMeshes.set(idx, { group, floor, sign, wallHeight, color });
      this.applyRoomLevel(idx, room.level || 1);
    });
  }

  applyRoomLevel(idx, level) {
    const ref = this.roomMeshes.get(idx);
    if (!ref) return;
    ref.floor.material.emissiveIntensity = Math.min(0.4, 0.05 + level * 0.04);
    ref.sign.scale.setScalar(1 + Math.min(level, 10) * 0.02);
  }

  setupGameEvents() {
    this.game.on('patientServed', (patient) => {
      this.particleSystem.burst(patient.color || 0x4CAF50, 10, new THREE.Vector3(-32, 8, -50));
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
    const skin = 0xffd9b3;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.45 * scale, 12, 12),
      new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 })
    );
    head.position.y = 1.5 * scale;
    head.castShadow = true;
    group.add(head);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4 * scale, 0.45 * scale, 1 * scale, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    );
    body.position.y = 0.8 * scale;
    body.castShadow = true;
    group.add(body);

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

    allStaff.forEach((staff, idx) => {
      let mesh = this.staffMeshes.get(staff.id);
      if (!mesh) {
        const color = (this.game.staffTiers[staff.tier] && this.game.staffTiers[staff.tier].color) || 0x90caf9;
        mesh = this.createCharacter(color, 0.9);
        const roomIdx = idx % ROOM_POSITIONS.length;
        const roomPos = ROOM_POSITIONS[roomIdx];
        const angle = (idx / Math.max(allStaff.length, 1)) * Math.PI * 2;
        mesh.position.set(roomPos.x + Math.cos(angle) * 6, 0, roomPos.z + Math.sin(angle) * 6);
        this.scene.add(mesh);
        this.staffMeshes.set(staff.id, mesh);
      }
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

    this.game.patientQueue.slice(0, 12).forEach((patient, idx) => {
      let mesh = this.patientMeshes.get(patient.id);
      if (!mesh) {
        mesh = this.createCharacter(patient.color || 0x4CAF50, 0.8);
        this.scene.add(mesh);
        this.patientMeshes.set(patient.id, mesh);
      }
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      mesh.position.set(-50 + col * 5, 0, -50 - row * 5);
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

    this.camera.position.lerp(this.targetCameraPos, this.smoothSpeed);
    if (this.shakeTime > 0) {
      const f = this.shakeTime / this.shakeDuration;
      this.camera.position.x += (Math.random() - 0.5) * this.shakeStrength * f;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeStrength * f;
      this.shakeTime -= deltaTime;
    }
    this.camera.lookAt(0, 0, 0);

    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  onWindowResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
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

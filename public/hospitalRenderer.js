import * as THREE from 'three';

export class HospitalRenderer {
  constructor(container, game) {
    this.game = game;
    this.container = container;
    this.clock = new THREE.Clock();
    this.patientAnimations = [];
    this.staffAnimations = [];
    this.time = 0;

    // Scene setup with HDR-like lighting
    this.scene = new THREE.Scene();
    this.updateSceneTheme();

    // Better fog for depth
    this.scene.fog = new THREE.Fog(0x87ceeb, 150, 300);

    // Camera - isometric view
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const zoom = 25;
    this.camera = new THREE.OrthographicCamera(
      -width / zoom,
      width / zoom,
      height / zoom,
      -height / zoom,
      0.1,
      1000
    );
    this.camera.position.set(50, 80, 50);
    this.camera.lookAt(0, 10, 0);

    // Renderer with high quality
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, precision: 'highp' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    this.renderer.shadowMap.resolution = 2048;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Professional lighting
    this.setupLighting();

    // Camera controls
    this.setupCameraControls();

    // Track objects
    this.roomObjects = new Map();
    this.patientObjects = [];
    this.staffObjects = [];
    this.decorativeObjects = [];

    // Build hospital
    this.buildHospital();

    // Resize handler
    window.addEventListener('resize', () => this.onWindowResize());

    // Start animation loop
    this.animate();
  }

  updateSceneTheme() {
    const themeColors = {
      0: { bg: 0xe3f2fd, fog: 0xbbdefb }, // Community - light blue
      1: { bg: 0xb3e5fc, fog: 0x81d4fa }, // Regional - brighter blue
      2: { bg: 0x80deea, fog: 0x4dd0e1 }, // Metro - cyan
      3: { bg: 0x4dd0e1, fog: 0x26c6da }, // Elite - dark cyan
      4: { bg: 0x0097a7, fog: 0x00838f }, // World-class - teal
    };

    const theme = themeColors[this.game.currentHospital] || themeColors[0];
    this.scene.background = new THREE.Color(theme.bg);
    if (this.scene.fog) {
      this.scene.fog.color = new THREE.Color(theme.fog);
    }
  }

  setupLighting() {
    // Soft ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Warm fill light
    const fillLight = new THREE.DirectionalLight(0xffebee, 0.3);
    fillLight.position.set(-50, 40, -50);
    this.scene.add(fillLight);

    // Main directional light with shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(80, 120, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -150;
    dirLight.shadow.camera.right = 150;
    dirLight.shadow.camera.top = 150;
    dirLight.shadow.camera.bottom = -150;
    dirLight.shadow.camera.far = 1000;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);

    // Accent light
    const accentLight = new THREE.DirectionalLight(0xccffcc, 0.2);
    accentLight.position.set(50, 60, -50);
    this.scene.add(accentLight);
  }

  setupCameraControls() {
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.camera.position.x -= deltaX * 0.15;
        this.camera.position.z -= deltaY * 0.15;

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    this.renderer.domElement.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.renderer.domElement.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });
  }

  buildHospital() {
    // Clear old objects
    this.scene.children = this.scene.children.filter((child) => {
      return child instanceof THREE.Light;
    });
    this.roomObjects.clear();
    this.decorativeObjects = [];

    // Ground floor
    this.createFloor();

    // Create rooms with detailed interiors
    this.createRooms();

    // Add decorative elements
    this.addDecorations();
  }

  createFloor() {
    // Main floor
    const floorGeometry = new THREE.PlaneGeometry(120, 120);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.7,
      metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid pattern for visual interest
    const gridHelper = new THREE.GridHelper(120, 24, 0xe0e0e0, 0xf0f0f0);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // Base/foundation shadow
    const baseGeometry = new THREE.PlaneGeometry(140, 140);
    const baseMaterial = new THREE.ShadowMaterial({ opacity: 0.1 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.1;
    this.scene.add(base);
  }

  createRooms() {
    const roomConfigs = [
      { id: 0, pos: { x: -30, z: -30 }, name: 'Reception', color: 0x4CAF50, type: 'reception' },
      { id: 1, pos: { x: 0, z: -30 }, name: 'Examination', color: 0x2196F3, type: 'examination' },
      { id: 2, pos: { x: 30, z: -30 }, name: 'Surgery', color: 0xFF6B6B, type: 'surgery' },
      { id: 3, pos: { x: -30, z: 0 }, name: 'ICU', color: 0xFF9800, type: 'icu' },
      { id: 4, pos: { x: 0, z: 0 }, name: 'Pharmacy', color: 0x9C27B0, type: 'pharmacy' },
      { id: 5, pos: { x: 30, z: 0 }, name: 'Lab', color: 0x00BCD4, type: 'lab' },
    ];

    roomConfigs.forEach((config, idx) => {
      const room = this.game.rooms[idx];
      this.createDetailedRoom(config, room);
    });
  }

  createDetailedRoom(config, roomData) {
    const roomGroup = new THREE.Group();
    roomGroup.userData = { roomId: config.id };

    const roomSize = 16;
    const wallHeight = 5 + roomData.level * 0.15;

    // Floor with gradient
    const floorGeo = new THREE.BoxGeometry(roomSize, 0.3, roomSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.6,
      metalness: Math.min(0.4, roomData.level * 0.08),
    });
    const roomFloor = new THREE.Mesh(floorGeo, floorMat);
    roomFloor.position.y = 0.15;
    roomFloor.castShadow = true;
    roomFloor.receiveShadow = true;
    roomGroup.add(roomFloor);

    // Walls with trim
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.9,
      metalness: 0,
    });

    // Front wall
    const frontWallGeo = new THREE.BoxGeometry(roomSize, wallHeight, 0.4);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.y = wallHeight / 2;
    frontWall.position.z = -roomSize / 2;
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    roomGroup.add(frontWall);

    // Right wall
    const rightWallGeo = new THREE.BoxGeometry(0.4, wallHeight, roomSize);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.y = wallHeight / 2;
    rightWall.position.x = roomSize / 2;
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Back wall (partial)
    const backWallGeo = new THREE.BoxGeometry(roomSize * 0.6, wallHeight, 0.4);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.y = wallHeight / 2;
    backWall.position.z = roomSize / 2;
    backWall.position.x = -roomSize * 0.2;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Ceiling
    const ceilingGeo = new THREE.BoxGeometry(roomSize, 0.2, roomSize);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = wallHeight + 0.1;
    ceiling.receiveShadow = true;
    roomGroup.add(ceiling);

    // Ceiling lights
    this.addCeilingLights(roomGroup, roomSize, wallHeight);

    // Room-specific furniture
    this.addRoomFurniture(roomGroup, config.type, roomData.level);

    // Door frame
    const doorFrameGeo = new THREE.BoxGeometry(3, wallHeight * 0.7, 0.4);
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x8B7355 });
    const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
    doorFrame.position.y = wallHeight * 0.35;
    doorFrame.position.z = -roomSize / 2;
    doorFrame.position.x = roomSize / 2 - 2;
    doorFrame.castShadow = true;
    roomGroup.add(doorFrame);

    // Room sign
    this.addRoomSign(roomGroup, config, roomData.level, wallHeight);

    // Position the room
    roomGroup.position.x = config.pos.x;
    roomGroup.position.z = config.pos.z;

    this.scene.add(roomGroup);
    this.roomObjects.set(config.id, roomGroup);
  }

  addCeilingLights(roomGroup, roomSize, wallHeight) {
    const lightCount = 2;
    for (let i = 0; i < lightCount; i++) {
      const x = (i - (lightCount - 1) / 2) * (roomSize / 3);

      // Light fixture
      const fixtureGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
      const fixtureMat = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2,
      });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(x, wallHeight + 0.05, 0);
      fixture.castShadow = true;
      roomGroup.add(fixture);

      // Glow effect
      const glowGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffff99,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(x, wallHeight, 0);
      roomGroup.add(glow);
    }
  }

  addRoomFurniture(roomGroup, type, level) {
    const furnitureConfigs = {
      reception: [
        { type: 'chair', color: 0xd32f2f, pos: { x: -4, y: 0.8, z: -4 } },
        { type: 'chair', color: 0xd32f2f, pos: { x: 4, y: 0.8, z: -4 } },
        { type: 'desk', color: 0x8B7355, pos: { x: 0, y: 1.2, z: 4 } },
      ],
      examination: [
        { type: 'bed', color: 0xffffff, pos: { x: 0, y: 1, z: 0 } },
        { type: 'cabinet', color: 0x616161, pos: { x: -6, y: 1.5, z: 0 } },
        { type: 'monitor', color: 0x424242, pos: { x: 6, y: 1.8, z: 0 } },
      ],
      surgery: [
        { type: 'light', color: 0xffff99, pos: { x: 0, y: 4.5, z: 0 } },
        { type: 'equipment', color: 0x555555, pos: { x: -5, y: 1.5, z: 0 } },
        { type: 'cart', color: 0x9e9e9e, pos: { x: 5, y: 1.2, z: 0 } },
      ],
      icu: [
        { type: 'monitor', color: 0x00ff00, pos: { x: -3, y: 1.8, z: -2 } },
        { type: 'equipment', color: 0x555555, pos: { x: 3, y: 1.5, z: 0 } },
        { type: 'bed', color: 0xfafafa, pos: { x: 0, y: 1, z: 2 } },
      ],
      pharmacy: [
        { type: 'shelf', color: 0x8B7355, pos: { x: -5, y: 1.8, z: -2 } },
        { type: 'shelf', color: 0x8B7355, pos: { x: -5, y: 1.8, z: 2 } },
        { type: 'counter', color: 0xcccccc, pos: { x: 4, y: 1.2, z: 0 } },
      ],
      lab: [
        { type: 'equipment', color: 0x555555, pos: { x: -5, y: 1.5, z: -2 } },
        { type: 'equipment', color: 0x555555, pos: { x: -5, y: 1.5, z: 2 } },
        { type: 'microscope', color: 0x424242, pos: { x: 5, y: 1.5, z: 0 } },
      ],
    };

    const furniture = furnitureConfigs[type] || [];
    const itemsToShow = Math.min(level + 1, furniture.length);

    furniture.slice(0, itemsToShow).forEach((item) => {
      const geo = new THREE.BoxGeometry(
        item.type === 'light' ? 0.3 : item.type === 'monitor' ? 0.8 : item.type === 'bed' ? 3 : 1.5,
        item.type === 'light' ? 0.2 : item.type === 'monitor' ? 1.2 : item.type === 'bed' ? 0.5 : 1.5,
        item.type === 'light' ? 0.3 : item.type === 'bed' ? 6 : 1.5
      );
      const mat = new THREE.MeshStandardMaterial({
        color: item.color,
        roughness: item.type === 'monitor' ? 0.2 : 0.7,
        metalness: item.type === 'monitor' ? 0.8 : 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(item.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      roomGroup.add(mesh);
    });
  }

  addRoomSign(roomGroup, config, level, wallHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#' + config.color.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 256, 128);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.name, 128, 65);
    ctx.font = '20px Arial';
    ctx.fillText('Lv. ' + level, 128, 100);

    const texture = new THREE.CanvasTexture(canvas);
    const signGeo = new THREE.PlaneGeometry(5, 2.5);
    const signMat = new THREE.MeshStandardMaterial({ map: texture });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.y = wallHeight - 1;
    sign.position.z = -8;
    sign.position.x = 0;
    roomGroup.add(sign);
  }

  addDecorations() {
    // Plants
    this.addPlants();

    // Wall decorations
    this.addWallDecorations();
  }

  addPlants() {
    const plantPositions = [
      { x: -50, z: -50 },
      { x: 50, z: -50 },
      { x: -50, z: 50 },
      { x: 50, z: 50 },
    ];

    plantPositions.forEach((pos) => {
      // Pot
      const potGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.8, 16);
      const potMat = new THREE.MeshStandardMaterial({ color: 0xbc6f28 });
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.set(pos.x, 0.4, pos.z);
      pot.castShadow = true;
      pot.receiveShadow = true;
      this.scene.add(pot);

      // Plant (simple cone)
      const plantGeo = new THREE.ConeGeometry(0.5, 2, 8);
      const plantMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
      const plant = new THREE.Mesh(plantGeo, plantMat);
      plant.position.set(pos.x, 1.6, pos.z);
      plant.castShadow = true;
      plant.receiveShadow = true;
      this.scene.add(plant);
    });
  }

  addWallDecorations() {
    // Add some wall art/posters
    const positions = [
      { x: -45, z: -45, rot: 0 },
      { x: 45, z: -45, rot: 0 },
    ];

    positions.forEach((pos) => {
      const artGeo = new THREE.PlaneGeometry(3, 2);
      const artMat = new THREE.MeshStandardMaterial({
        color: 0x1976d2,
        roughness: 0.7,
      });
      const art = new THREE.Mesh(artGeo, artMat);
      art.position.set(pos.x, 3, pos.z + 50);
      art.rotation.y = pos.rot;
      this.scene.add(art);
    });
  }

  updatePatients() {
    this.patientObjects.forEach((obj) => this.scene.remove(obj));
    this.patientObjects = [];
    this.patientAnimations = [];

    this.game.patientQueue.slice(0, 10).forEach((patient, index) => {
      const patientGroup = new THREE.Group();

      // Head
      const headGeo = new THREE.SphereGeometry(0.45, 32, 32);
      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xfdbcb4,
        roughness: 0.6,
      });
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.4;
      head.castShadow = true;
      head.receiveShadow = true;
      patientGroup.add(head);

      // Body
      const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0x4CAF50 : 0x2196F3,
        roughness: 0.5,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.65;
      body.castShadow = true;
      body.receiveShadow = true;
      patientGroup.add(body);

      // Arms
      const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 16);
      const armMat = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });

      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-0.6, 0.9, 0);
      leftArm.rotation.z = Math.PI / 6;
      leftArm.castShadow = true;
      patientGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(0.6, 0.9, 0);
      rightArm.rotation.z = -Math.PI / 6;
      rightArm.castShadow = true;
      patientGroup.add(rightArm);

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.15, 0.15, 0);
      leftLeg.castShadow = true;
      patientGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.15, 0.15, 0);
      rightLeg.castShadow = true;
      patientGroup.add(rightLeg);

      // Queue position
      const row = Math.floor(index / 5);
      const col = index % 5;
      patientGroup.position.x = -22 + col * 2.5;
      patientGroup.position.z = -22 - row * 2;
      patientGroup.position.y = 0;

      // Animation data
      this.patientAnimations.push({
        object: patientGroup,
        type: index % 3,
        startX: patientGroup.position.x,
        startZ: patientGroup.position.z,
        time: 0,
      });

      this.scene.add(patientGroup);
      this.patientObjects.push(patientGroup);
    });
  }

  updateStaff() {
    this.staffObjects.forEach((obj) => this.scene.remove(obj));
    this.staffObjects = [];
    this.staffAnimations = [];

    let staffIndex = 0;
    Object.entries(this.game.staffByTier).forEach(([tier, staff]) => {
      staff.slice(0, 4).forEach((member) => {
        const staffGroup = new THREE.Group();

        // Head
        const headGeo = new THREE.SphereGeometry(0.4, 32, 32);
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.35;
        head.castShadow = true;
        staffGroup.add(head);

        // Body (scrubs/coat)
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
        const tierColors = {
          intern: 0x90caf9,
          resident: 0x81c784,
          attending: 0xffb74d,
          specialist: 0xf06292,
        };
        const bodyMat = new THREE.MeshStandardMaterial({
          color: tierColors[tier] || 0x888888,
          roughness: 0.6,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.65;
        body.castShadow = true;
        staffGroup.add(body);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
        const armMat = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.5, 0.85, 0);
        leftArm.rotation.z = Math.PI / 5;
        leftArm.castShadow = true;
        staffGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.5, 0.85, 0);
        rightArm.rotation.z = -Math.PI / 5;
        rightArm.castShadow = true;
        staffGroup.add(rightArm);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.12, 0.15, 0);
        leftLeg.castShadow = true;
        staffGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.12, 0.15, 0);
        rightLeg.castShadow = true;
        staffGroup.add(rightLeg);

        // Distribute across rooms
        const roomIndex = (staffIndex % 5) + 1;
        const roomPos = this.getRoomPosition(roomIndex);
        staffGroup.position.x = roomPos.x + (Math.random() - 0.5) * 4;
        staffGroup.position.z = roomPos.z + (Math.random() - 0.5) * 4;
        staffGroup.position.y = 0;

        // Animation
        this.staffAnimations.push({
          object: staffGroup,
          startX: staffGroup.position.x,
          startZ: staffGroup.position.z,
          time: Math.random() * Math.PI * 2,
        });

        this.scene.add(staffGroup);
        this.staffObjects.push(staffGroup);
        staffIndex++;
      });
    });
  }

  updateAnimations(deltaTime) {
    this.time += deltaTime;

    // Animate patients
    this.patientAnimations.forEach((anim) => {
      anim.time += deltaTime;

      if (anim.type === 0) {
        // Sit and wait
        anim.object.position.y = -0.1;
        anim.object.rotation.y = 0;
      } else if (anim.type === 1) {
        // Stand and sway
        anim.object.position.y = Math.sin(anim.time * 2) * 0.05;
        anim.object.rotation.y = Math.sin(anim.time * 1.5) * 0.3;
      } else {
        // Pace
        const pace = Math.sin(anim.time * 1.2);
        anim.object.position.x = anim.startX + pace * 1.2;
        anim.object.rotation.y = pace > 0 ? 0.2 : -0.2;
      }
    });

    // Animate staff
    this.staffAnimations.forEach((anim) => {
      anim.time += deltaTime * 0.5;
      const walk = Math.sin(anim.time) * 0.5;
      anim.object.position.x = anim.startX + walk;
      anim.object.position.y = Math.cos(anim.time * 2) * 0.1;
      anim.object.rotation.y = Math.sin(anim.time * 0.8) * 0.5;
    });
  }

  getRoomPosition(roomIndex) {
    const positions = [
      { x: -30, z: -30 },
      { x: 0, z: -30 },
      { x: 30, z: -30 },
      { x: -30, z: 0 },
      { x: 0, z: 0 },
      { x: 30, z: 0 },
    ];
    return positions[roomIndex] || positions[0];
  }

  onWindowResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const zoom = 25;

    this.camera.left = -width / zoom;
    this.camera.right = width / zoom;
    this.camera.top = height / zoom;
    this.camera.bottom = -height / zoom;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    this.updateAnimations(deltaTime);
    this.updatePatients();
    this.updateStaff();
    this.updateSceneTheme();

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

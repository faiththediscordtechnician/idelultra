import * as THREE from 'three';

export class HospitalRenderer {
  constructor(container, game) {
    this.game = game;
    this.container = container;
    this.clock = new THREE.Clock();
    this.patientAnimations = [];

    // Scene setup with hospital theme
    this.scene = new THREE.Scene();
    this.updateSceneTheme();
    this.scene.fog = new THREE.Fog(0x87ceeb, 200, 500);

    // Camera - isometric view (use window dimensions as fallback)
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const zoom = 30;
    this.camera = new THREE.OrthographicCamera(
      -width / zoom,
      width / zoom,
      height / zoom,
      -height / zoom,
      0.1,
      1000
    );
    this.camera.position.set(40, 60, 40);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, precision: 'highp' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    console.log('Hospital Renderer initialized with dimensions:', width, height);

    // Lighting
    this.setupLighting();

    // Camera controls
    this.setupCameraControls();

    // Room objects and props
    this.roomObjects = new Map();
    this.patientObjects = [];
    this.staffObjects = [];

    // Build initial hospital
    this.buildHospital();

    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start render loop
    this.animate();
  }

  updateSceneTheme() {
    const hospital = this.game.hospitals[this.game.currentHospital];
    const themeColors = {
      0: { bg: 0x87ceeb, fog: 0x87ceeb }, // Community Clinic - light blue
      1: { bg: 0x9bb5e0, fog: 0x9bb5e0 }, // Regional - medium blue
      2: { bg: 0x7da3d5, fog: 0x7da3d5 }, // Metro - darker blue
      3: { bg: 0x6b92ca, fog: 0x6b92ca }, // Elite - deep blue
      4: { bg: 0x4a6fa5, fog: 0x4a6fa5 }, // World-class - very deep blue
    };

    const theme = themeColors[this.game.currentHospital] || themeColors[0];
    this.scene.background = new THREE.Color(theme.bg);
    if (this.scene.fog) {
      this.scene.fog.color = new THREE.Color(theme.fog);
    }
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    this.scene.add(dirLight);

    this.ambientLight = ambientLight;
    this.directionalLight = dirLight;
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

        this.camera.position.x -= deltaX * 0.1;
        this.camera.position.z -= deltaY * 0.1;

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
      if (child instanceof THREE.Light) return true;
      return false;
    });
    this.roomObjects.clear();

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 20, 0x888888, 0xcccccc);
    this.scene.add(gridHelper);

    // Rooms
    this.createRooms();
  }

  createRooms() {
    const roomPositions = {
      0: { x: -20, z: -20 },
      1: { x: 0, z: -20 },
      2: { x: 20, z: -20 },
      3: { x: -20, z: 0 },
      4: { x: 0, z: 0 },
      5: { x: 20, z: 0 },
    };

    this.game.rooms.forEach((room, index) => {
      const pos = roomPositions[index];
      const roomGroup = new THREE.Group();
      roomGroup.userData = { roomId: index };

      // Room base color based on type
      const baseColor = this.getRoomColor(room.type);

      // Room floor with level-based shine
      const roomGeometry = new THREE.BoxGeometry(12, 0.5, 12);
      const shininess = Math.min(100, room.level * 10);
      const roomMaterial = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: Math.max(0.3, 0.8 - room.level * 0.05),
        metalness: Math.min(0.5, room.level * 0.05),
      });
      const roomBase = new THREE.Mesh(roomGeometry, roomMaterial);
      roomBase.position.y = 0.25;
      roomBase.castShadow = true;
      roomBase.receiveShadow = true;
      roomGroup.add(roomBase);

      // Room walls
      this.addWalls(roomGroup, room.type, room.level);

      // Room decorations based on level
      this.addRoomCosmetics(roomGroup, room.type, room.level);

      // Room label
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(room.icon + ' ' + room.name, 128, 70);
      ctx.font = '20px Arial';
      ctx.fillText(`Lv. ${room.level}`, 128, 100);

      const texture = new THREE.CanvasTexture(canvas);
      const signGeometry = new THREE.PlaneGeometry(10, 3);
      const signMaterial = new THREE.MeshStandardMaterial({ map: texture });
      const sign = new THREE.Mesh(signGeometry, signMaterial);
      sign.position.y = 8;
      sign.position.z = -6;
      roomGroup.add(sign);

      roomGroup.position.x = pos.x;
      roomGroup.position.z = pos.z;

      this.scene.add(roomGroup);
      this.roomObjects.set(index, roomGroup);
    });
  }

  addRoomCosmetics(group, type, level) {
    // Add cosmetic decorations based on room level
    if (level === 1) return; // No cosmetics at level 1

    const cosmetics = {
      reception: [
        { name: 'Chair', color: 0x8B4513, pos: { x: -3, y: 0.5, z: -2 } },
        { name: 'Chair', color: 0x8B4513, pos: { x: 3, y: 0.5, z: -2 } },
      ],
      examination: [
        { name: 'Bed', color: 0xffffff, pos: { x: 0, y: 0.8, z: 0 } },
        { name: 'Cabinet', color: 0x666666, pos: { x: -4, y: 1.5, z: 0 } },
      ],
      surgery: [
        { name: 'Light', color: 0xFFFF99, pos: { x: 0, y: 5, z: 0 } },
        { name: 'Equipment', color: 0x555555, pos: { x: -3, y: 1, z: 0 } },
      ],
      icu: [
        { name: 'Monitor', color: 0x00FF00, pos: { x: -2, y: 1.5, z: 0 } },
        { name: 'Equipment', color: 0x555555, pos: { x: 2, y: 1, z: 0 } },
      ],
      pharmacy: [
        { name: 'Shelf', color: 0x8B7355, pos: { x: -2, y: 1.5, z: 0 } },
        { name: 'Counter', color: 0xcccccc, pos: { x: 2, y: 0.8, z: 0 } },
      ],
      lab: [
        { name: 'Equipment', color: 0x555555, pos: { x: -3, y: 1, z: 0 } },
        { name: 'Rack', color: 0x666666, pos: { x: 3, y: 1.5, z: 0 } },
      ],
    };

    const roomCosmetics = cosmetics[type] || [];
    roomCosmetics.slice(0, Math.min(level - 1, roomCosmetics.length)).forEach((item) => {
      const geo = new THREE.BoxGeometry(1, 1.5, 1);
      const mat = new THREE.MeshStandardMaterial({ color: item.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(item.pos);
      mesh.castShadow = true;
      group.add(mesh);
    });
  }

  getRoomColor(type) {
    const colors = {
      reception: 0x4CAF50,
      examination: 0x2196F3,
      surgery: 0xFF6B6B,
      icu: 0xFF9800,
      pharmacy: 0x9C27B0,
      lab: 0x00BCD4,
    };
    return colors[type] || 0x888888;
  }

  addWalls(group, type, level) {
    const wallHeight = 5 + level * 0.2; // Taller walls at higher levels
    const wallThickness = 0.3;
    const roomSize = 12;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.8,
    });

    // Front wall
    const frontGeometry = new THREE.BoxGeometry(roomSize, wallHeight, wallThickness);
    const frontWall = new THREE.Mesh(frontGeometry, wallMaterial);
    frontWall.position.y = wallHeight / 2;
    frontWall.position.z = -roomSize / 2;
    frontWall.castShadow = true;
    group.add(frontWall);

    // Right wall
    const rightGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, roomSize);
    const rightWall = new THREE.Mesh(rightGeometry, wallMaterial);
    rightWall.position.y = wallHeight / 2;
    rightWall.position.x = roomSize / 2;
    rightWall.castShadow = true;
    group.add(rightWall);

    // Add window details at higher levels
    if (level >= 3) {
      const windowGeometry = new THREE.PlaneGeometry(2, 1);
      const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x87CEEB });
      const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
      window1.position.set(-3, 3, -6);
      group.add(window1);

      const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
      window2.position.set(3, 3, -6);
      group.add(window2);
    }
  }

  updatePatients() {
    // Clear old patient objects
    this.patientObjects.forEach((obj) => this.scene.remove(obj));
    this.patientObjects = [];
    this.patientAnimations = [];

    // Create patient objects for queue
    this.game.patientQueue.slice(0, 8).forEach((patient, index) => {
      const patientGroup = new THREE.Group();

      // Head
      const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });
      const head = new THREE.Mesh(headGeometry, skinMaterial);
      head.position.y = 1.5;
      head.castShadow = true;
      patientGroup.add(head);

      // Body
      const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1, 32);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.7;
      body.castShadow = true;
      patientGroup.add(body);

      // Arms
      const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16);
      const armMaterial = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.7, 0.9, 0);
      leftArm.rotation.z = Math.PI / 4;
      leftArm.castShadow = true;
      patientGroup.add(leftArm);

      // Starting position in lobby
      const row = Math.floor(index / 4);
      const col = index % 4;
      patientGroup.position.x = -20 + col * 2;
      patientGroup.position.z = -20 - row * 1.5;
      patientGroup.position.y = 0.3;

      // Add animation
      this.patientAnimations.push({
        object: patientGroup,
        startX: patientGroup.position.x,
        startZ: patientGroup.position.z,
        animationTime: 0,
        type: index % 3 === 0 ? 'sit' : index % 3 === 1 ? 'stand' : 'pace',
      });

      this.scene.add(patientGroup);
      this.patientObjects.push(patientGroup);
    });
  }

  updateStaff() {
    this.staffObjects.forEach((obj) => this.scene.remove(obj));
    this.staffObjects = [];

    let staffIndex = 0;
    Object.entries(this.game.staffByTier).forEach(([tier, staff]) => {
      staff.slice(0, 3).forEach((member) => {
        const staffGroup = new THREE.Group();

        // Head
        const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 1.3;
        head.castShadow = true;
        staffGroup.add(head);

        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 32);
        const tierColor = this.getStaffColor(tier);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: tierColor });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        staffGroup.add(body);

        // Distribute staff across rooms
        const roomIndex = (staffIndex % 5) + 1;
        const roomPos = this.getRoomPosition(roomIndex);
        staffGroup.position.x = roomPos.x + (Math.random() - 0.5) * 3;
        staffGroup.position.z = roomPos.z + (Math.random() - 0.5) * 3;
        staffGroup.position.y = 0.3;

        this.scene.add(staffGroup);
        this.staffObjects.push(staffGroup);
        staffIndex++;
      });
    });
  }

  updatePatientAnimations(deltaTime) {
    this.patientAnimations.forEach((anim) => {
      anim.animationTime += deltaTime;

      if (anim.type === 'sit') {
        // Sit still
        anim.object.position.y = 0.3;
      } else if (anim.type === 'stand') {
        // Slight sway
        anim.object.position.y = 0.3 + Math.sin(anim.animationTime * 2) * 0.1;
      } else if (anim.type === 'pace') {
        // Pace back and forth
        const pace = Math.sin(anim.animationTime * 1.5);
        anim.object.position.x = anim.startX + pace * 1.5;
        anim.object.rotation.y = pace > 0 ? 0 : Math.PI;
      }
    });
  }

  getStaffColor(tier) {
    const colors = {
      intern: 0x90caf9,
      resident: 0x81c784,
      attending: 0xffb74d,
      specialist: 0xf06292,
    };
    return colors[tier] || 0x888888;
  }

  getRoomPosition(roomIndex) {
    const positions = [
      { x: -20, z: -20 },
      { x: 0, z: -20 },
      { x: 20, z: -20 },
      { x: -20, z: 0 },
      { x: 0, z: 0 },
      { x: 20, z: 0 },
    ];
    return positions[roomIndex] || positions[0];
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const zoom = 30;

    this.camera.left = -width / zoom;
    this.camera.right = width / zoom;
    this.camera.top = height / zoom;
    this.camera.bottom = -height / zoom;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    // Update animations
    this.updatePatientAnimations(deltaTime);

    // Update patients and staff
    this.updatePatients();
    this.updateStaff();

    // Update scene theme if hospital changed
    this.updateSceneTheme();

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

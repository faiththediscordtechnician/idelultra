import * as THREE from 'https://cdn.jsdelivr.net/npm/three@r128/build/three.module.js';

export class HospitalRenderer {
  constructor(container, game) {
    this.game = game;
    this.container = container;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 200, 500);

    // Camera - isometric view
    const width = container.clientWidth;
    const height = container.clientHeight;
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
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Camera controls (click and drag)
    this.setupCameraControls();

    // Room objects and props
    this.roomObjects = new Map();
    this.patientObjects = [];
    this.staffObjects = [];

    // Build initial hospital
    this.buildHospital();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start render loop
    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light (sun)
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

        // Move camera based on drag
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

    // Grid for reference
    const gridHelper = new THREE.GridHelper(100, 20, 0x888888, 0xcccccc);
    this.scene.add(gridHelper);

    // Create rooms based on game state
    this.createRooms();
  }

  createRooms() {
    const roomPositions = {
      0: { x: -20, z: -20 }, // Reception
      1: { x: 0, z: -20 },   // Examination
      2: { x: 20, z: -20 },  // Surgery
      3: { x: -20, z: 0 },   // ICU
      4: { x: 0, z: 0 },     // Pharmacy
      5: { x: 20, z: 0 },    // Lab
    };

    this.game.rooms.forEach((room, index) => {
      const pos = roomPositions[index];

      // Create room group
      const roomGroup = new THREE.Group();
      roomGroup.userData = { roomId: index };

      // Room floor/base
      const roomGeometry = new THREE.BoxGeometry(12, 0.5, 12);
      const roomMaterial = new THREE.MeshStandardMaterial({
        color: this.getRoomColor(room.type),
        roughness: 0.7,
        metalness: 0.2,
      });
      const roomBase = new THREE.Mesh(roomGeometry, roomMaterial);
      roomBase.position.y = 0.25;
      roomBase.castShadow = true;
      roomBase.receiveShadow = true;
      roomGroup.add(roomBase);

      // Room walls (simple)
      this.addWalls(roomGroup, room.type);

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

      // Position room group
      roomGroup.position.x = pos.x;
      roomGroup.position.z = pos.z;

      this.scene.add(roomGroup);
      this.roomObjects.set(index, roomGroup);
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

  addWalls(group, type) {
    const wallHeight = 6;
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
  }

  updatePatients() {
    // Clear old patient objects
    this.patientObjects.forEach((obj) => this.scene.remove(obj));
    this.patientObjects = [];

    // Create new patient objects for queue
    this.game.patientQueue.slice(0, 5).forEach((patient, index) => {
      const patientGroup = new THREE.Group();

      // Simple character (cylinder body + sphere head)
      const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });
      const head = new THREE.Mesh(headGeometry, skinMaterial);
      head.position.y = 1.5;
      patientGroup.add(head);

      const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1, 32);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.7;
      patientGroup.add(body);

      // Position in lobby
      patientGroup.position.x = -20 + index * 1.5;
      patientGroup.position.z = -20 + index * 0.5;
      patientGroup.position.y = 0.3;

      patientGroup.castShadow = true;
      this.scene.add(patientGroup);
      this.patientObjects.push(patientGroup);
    });
  }

  updateStaff() {
    // Clear old staff objects
    this.staffObjects.forEach((obj) => this.scene.remove(obj));
    this.staffObjects = [];

    // Distribute staff across rooms
    let staffIndex = 0;
    Object.entries(this.game.staffByTier).forEach(([tier, staff]) => {
      staff.slice(0, 3).forEach((member) => {
        const staffGroup = new THREE.Group();

        // Character
        const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 1.3;
        staffGroup.add(head);

        const bodyGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 32);
        const tierColor = this.getStaffColor(tier);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: tierColor });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        staffGroup.add(body);

        // Random room position
        const roomIndex = (staffIndex % 5) + 1;
        const roomPos = this.getRoomPosition(roomIndex);
        staffGroup.position.x = roomPos.x + (Math.random() - 0.5) * 3;
        staffGroup.position.z = roomPos.z + (Math.random() - 0.5) * 3;
        staffGroup.position.y = 0.3;

        staffGroup.castShadow = true;
        this.scene.add(staffGroup);
        this.staffObjects.push(staffGroup);
        staffIndex++;
      });
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

    // Update patients and staff
    this.updatePatients();
    this.updateStaff();

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

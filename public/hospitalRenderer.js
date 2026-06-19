import * as THREE from 'three';

export class HospitalRenderer {
  constructor(container, game) {
    this.game = game;
    this.container = container;
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.updateSceneTheme();
    this.scene.fog = new THREE.Fog(0x87ceeb, 200, 400);

    // Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(40, 50, 40);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Camera controls
    this.setupCameraControls();

    // Collections
    this.roomObjects = new Map();
    this.patientObjects = [];
    this.staffObjects = [];

    // Build
    this.buildHospital();

    // Resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Animate
    this.animate();

    console.log('🏥 Hospital Renderer initialized - Scene objects:', this.scene.children.length);
  }

  updateSceneTheme() {
    const themes = {
      0: { bg: 0xe3f2fd, fog: 0xbbdefb },
      1: { bg: 0xb3e5fc, fog: 0x81d4fa },
      2: { bg: 0x80deea, fog: 0x4dd0e1 },
      3: { bg: 0x4dd0e1, fog: 0x26c6da },
      4: { bg: 0x0097a7, fog: 0x00838f },
    };
    const theme = themes[this.game.currentHospital] || themes[0];
    this.scene.background = new THREE.Color(theme.bg);
    if (this.scene.fog) this.scene.fog.color = new THREE.Color(theme.fog);
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(60, 100, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xccffcc, 0.3);
    fill.position.set(-40, 60, -40);
    this.scene.add(fill);
  }

  setupCameraControls() {
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.prevMouse.x;
        const dy = e.clientY - this.prevMouse.y;
        this.camera.position.x -= dx * 0.1;
        this.camera.position.z -= dy * 0.1;
        this.prevMouse = { x: e.clientX, y: e.clientY };
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
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(200, 40, 0xcccccc, 0xeeeeee);
    grid.position.y = 0.01;
    this.scene.add(grid);

    // Create rooms
    this.createRooms();
  }

  createRooms() {
    const positions = [
      { x: -25, z: -25, color: 0x4CAF50, name: 'Reception' },
      { x: 0, z: -25, color: 0x2196F3, name: 'Exam' },
      { x: 25, z: -25, color: 0xFF6B6B, name: 'Surgery' },
      { x: -25, z: 0, color: 0xFF9800, name: 'ICU' },
      { x: 0, z: 0, color: 0x9C27B0, name: 'Pharmacy' },
      { x: 25, z: 0, color: 0x00BCD4, name: 'Lab' },
    ];

    positions.forEach((pos, idx) => {
      const room = this.game.rooms[idx];
      const group = new THREE.Group();

      // Floor
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.4, 14),
        new THREE.MeshStandardMaterial({ color: pos.color, roughness: 0.6 })
      );
      floor.position.y = 0.2;
      floor.castShadow = true;
      floor.receiveShadow = true;
      group.add(floor);

      // Walls
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 });

      const frontWall = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.3), wallMat);
      frontWall.position.y = 3;
      frontWall.position.z = -7;
      frontWall.castShadow = true;
      group.add(frontWall);

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 14), wallMat);
      rightWall.position.y = 3;
      rightWall.position.x = 7;
      rightWall.castShadow = true;
      group.add(rightWall);

      // Sign
      const signGeo = new THREE.PlaneGeometry(4, 2);
      const signTex = this.createSignTexture(pos.name, pos.color);
      const signMat = new THREE.MeshStandardMaterial({ map: signTex });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, 5, -7.2);
      group.add(sign);

      // Position group
      group.position.set(pos.x, 0, pos.z);
      this.scene.add(group);
      this.roomObjects.set(idx, group);
    });

    console.log('✅ Created', positions.length, 'rooms');
  }

  createSignTexture(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 256, 128);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 80);

    return new THREE.CanvasTexture(canvas);
  }

  updatePatients() {
    this.patientObjects.forEach((p) => this.scene.remove(p));
    this.patientObjects = [];

    this.game.patientQueue.slice(0, 8).forEach((patient, i) => {
      const group = new THREE.Group();

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xfdbcb4 })
      );
      head.position.y = 1.5;
      head.castShadow = true;
      group.add(head);

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1, 16),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0x2196F3 : 0x4CAF50 })
      );
      body.position.y = 0.8;
      body.castShadow = true;
      group.add(body);

      const row = Math.floor(i / 4);
      const col = i % 4;
      group.position.set(-20 + col * 3, 0, -20 - row * 2);

      this.scene.add(group);
      this.patientObjects.push(group);
    });
  }

  updateStaff() {
    this.staffObjects.forEach((s) => this.scene.remove(s));
    this.staffObjects = [];

    let idx = 0;
    Object.entries(this.game.staffByTier).forEach(([tier, staff]) => {
      staff.slice(0, 2).forEach(() => {
        const group = new THREE.Group();

        const tierColors = {
          intern: 0x90caf9,
          resident: 0x81c784,
          attending: 0xffb74d,
          specialist: 0xf06292,
        };

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xfdbcb4 })
        );
        head.position.y = 1.3;
        head.castShadow = true;
        group.add(head);

        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16),
          new THREE.MeshStandardMaterial({ color: tierColors[tier] || 0x888 })
        );
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        const roomIdx = (idx % 5) + 1;
        const pos = [
          { x: -25, z: -25 },
          { x: 0, z: -25 },
          { x: 25, z: -25 },
          { x: -25, z: 0 },
          { x: 0, z: 0 },
          { x: 25, z: 0 },
        ][roomIdx];

        group.position.set(
          pos.x + (Math.random() - 0.5) * 5,
          0,
          pos.z + (Math.random() - 0.5) * 5
        );

        this.scene.add(group);
        this.staffObjects.push(group);
        idx++;
      });
    });
  }

  onWindowResize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  animate = () => {
    requestAnimationFrame(this.animate);

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

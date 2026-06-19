import * as THREE from 'three';

export class HospitalRenderer {
  constructor(container, game) {
    this.game = game;
    this.container = container;
    this.clock = new THREE.Clock();

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 300, 600);

    // Camera setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 2000);
    this.camera.position.set(0, 60, 80);
    this.camera.lookAt(0, 0, 0);

    // Renderer with post-processing
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, precision: 'highp' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    this.renderer.shadowMap.resolution = 2048;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Collections
    this.roomMeshes = new Map();
    this.characterPool = [];
    this.particleSystem = new ParticleSystem(this.scene);

    // Camera controls
    this.setupCameraControls();

    // Build hospital
    this.buildHospital();

    // Connect game events
    this.setupGameEvents();

    // Resize handler
    window.addEventListener('resize', () => this.onWindowResize());

    // Animation loop
    this.animate();

    console.log('🏥 Hospital Renderer initialized');
  }

  setupLighting() {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    // Main directional light (sun)
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.mainLight.position.set(100, 120, 100);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.set(2048, 2048);
    this.mainLight.shadow.camera.left = -200;
    this.mainLight.shadow.camera.right = 200;
    this.mainLight.shadow.camera.top = 200;
    this.mainLight.shadow.camera.bottom = -200;
    this.mainLight.shadow.camera.far = 500;
    this.scene.add(this.mainLight);

    // Fill light for depth
    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.4);
    fillLight.position.set(-100, 80, -100);
    this.scene.add(fillLight);

    // Hemisphere light for natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    this.scene.add(hemiLight);
  }

  setupCameraControls() {
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };
    this.targetCameraPos = this.camera.position.clone();
    this.smoothSpeed = 0.1;

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

        // Clamp camera position
        this.targetCameraPos.x = Math.max(-150, Math.min(150, this.targetCameraPos.x));
        this.targetCameraPos.z = Math.max(-150, Math.min(150, this.targetCameraPos.z));

        this.prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    this.renderer.domElement.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.renderer.domElement.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    // Mouse wheel zoom
    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetCameraPos.y += e.deltaY * 0.05;
      this.targetCameraPos.y = Math.max(30, Math.min(150, this.targetCameraPos.y));
    });
  }

  buildHospital() {
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = 0;
    this.scene.add(ground);

    // Grid for visual reference
    const gridHelper = new THREE.GridHelper(300, 30, 0x444444, 0x333333);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // Create room structures
    this.createRooms();

    // Create decorative elements
    this.createEnvironment();
  }

  createRooms() {
    const positions = [
      { x: -50, z: -50, name: 'Reception' },
      { x: 0, z: -50, name: 'Exam' },
      { x: 50, z: -50, name: 'Surgery' },
      { x: -50, z: 0, name: 'ICU' },
      { x: 0, z: 0, name: 'Pharmacy' },
      { x: 50, z: 0, name: 'Lab' },
    ];

    positions.forEach((pos, idx) => {
      const room = this.game.rooms[idx];
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      // Floor with gradient
      const floorGeo = new THREE.BoxGeometry(35, 0.5, 35);
      const floorMat = new THREE.MeshStandardMaterial({
        color: room.color,
        roughness: 0.7,
        metalness: 0.05,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.y = 0.25;
      floor.castShadow = true;
      floor.receiveShadow = true;
      group.add(floor);

      // Walls
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xfafafa,
        roughness: 0.9,
      });

      // Front wall
      const frontWall = new THREE.Mesh(new THREE.BoxGeometry(35, 12, 0.5), wallMat);
      frontWall.position.set(0, 6, -17.75);
      frontWall.castShadow = true;
      frontWall.receiveShadow = true;
      group.add(frontWall);

      // Right wall
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 35), wallMat);
      rightWall.position.set(17.75, 6, 0);
      rightWall.castShadow = true;
      rightWall.receiveShadow = true;
      group.add(rightWall);

      // Ceiling
      const ceilingMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.8,
        emissive: 0x222222,
      });
      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(35, 0.5, 35), ceilingMat);
      ceiling.position.y = 12.25;
      ceiling.receiveShadow = true;
      group.add(ceiling);

      // Ceiling lights
      for (let i = 0; i < 4; i++) {
        const lightX = -8.75 + (i % 2) * 17.5;
        const lightZ = -8.75 + Math.floor(i / 2) * 17.5;
        const light = new THREE.PointLight(0xffffff, 0.5, 20);
        light.position.set(lightX, 11, lightZ);
        light.castShadow = true;
        group.add(light);
      }

      // Room sign
      const signGeo = new THREE.BoxGeometry(8, 4, 0.2);
      const signMat = new THREE.MeshStandardMaterial({
        color: room.color,
        roughness: 0.5,
        metalness: 0.8,
        emissive: room.color,
        emissiveIntensity: 0.2,
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, 13, -17.8);
      sign.castShadow = true;
      group.add(sign);

      // Add text label to canvas
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#' + room.color.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.name, 128, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const textMat = new THREE.MeshStandardMaterial({ map: texture });
      const textMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.1), textMat);
      textMesh.position.set(0, 13, -17.7);
      group.add(textMesh);

      this.scene.add(group);
      this.roomMeshes.set(idx, group);
    });
  }

  createEnvironment() {
    // Skybox or simple sky effect
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    const skyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      side: THREE.BackSide,
      emissive: 0x0a0a1a,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  setupGameEvents() {
    this.game.on('patientServed', (patient) => {
      this.particleSystem.burst(patient.color, 10);
    });

    this.game.on('staffHired', ({ tier }) => {
      this.particleSystem.burst(this.game.staffTiers[tier].color, 15);
    });

    this.game.on('roomBought', ({ room }) => {
      this.particleSystem.burst(room.color, 20);
    });

    this.game.on('missionCompleted', () => {
      this.particleSystem.burst(0xffd700, 25);
    });
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    // Smooth camera movement
    this.camera.position.lerp(this.targetCameraPos, this.smoothSpeed);
    this.camera.lookAt(0, 10, 0);

    // Update particles
    this.particleSystem.update(deltaTime);

    // Subtle light animation
    const time = this.clock.getElapsedTime();
    this.mainLight.intensity = 1.2 + Math.sin(time * 0.5) * 0.1;

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
    this.poolSize = 500;
    this.pool = [];

    // Create pool of particles
    for (let i = 0; i < this.poolSize; i++) {
      const geo = new THREE.SphereGeometry(0.3, 8, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.active = false;
      this.pool.push(mesh);
    }
  }

  burst(color, count, position = new THREE.Vector3(0, 20, 0)) {
    for (let i = 0; i < count; i++) {
      const particle = this.pool.pop() || new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 })
      );

      particle.position.copy(position);
      particle.material.color.setHex(color);
      particle.material.emissive.setHex(color);

      const angle = (Math.PI * 2 * i) / count;
      const speed = 3 + Math.random() * 2;
      particle.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        2 + Math.random() * 2,
        Math.sin(angle) * speed
      );
      particle.life = 1.5;
      particle.maxLife = 1.5;
      particle.active = true;

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

      const alpha = p.life / p.maxLife;
      p.material.opacity = alpha;
      p.scale.setScalar(alpha);
    }
  }
}

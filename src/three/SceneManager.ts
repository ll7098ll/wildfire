import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraPreset, FireFrontPoint, LightingMode, WeatherConditions } from '../types';
import { FireParticleSystem } from './FireParticleSystem';
import { TerrainMesh } from './TerrainMesh';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  public terrain: TerrainMesh;
  public fireParticles: FireParticleSystem;

  // Lights
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private fireLight1: THREE.PointLight;
  private fireLight2: THREE.PointLight;
  private fireLight3: THREE.PointLight;

  // Atmosphere
  private currentLighting: LightingMode = 'dusk';
  private targetCameraPos = new THREE.Vector3(-140, 360, 640);
  private targetLookAt = new THREE.Vector3(0, 85, 0);
  private currentCameraPreset: CameraPreset = 'orbit';

  // Raycaster for click-to-ignite
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };

  // Hover ignition reticle & click spark group
  private reticleMesh: THREE.Group;
  private reticleRing: THREE.Mesh;
  private reticlePulse: THREE.Mesh;

  constructor(
    container: HTMLElement,
    terrain: TerrainMesh,
    fireParticles: FireParticleSystem,
    onIgniteClick: (worldX: number, worldZ: number) => void
  ) {
    this.terrain = terrain;
    this.fireParticles = fireParticles;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    const is100x = this.terrain.config.scaleMode === '100x';
    const initialFogDensity = is100x ? 0.000035 : 0.00030;
    this.scene.fog = new THREE.FogExp2(0x90bce2, initialFogDensity);

    const width = Math.max(container.clientWidth || 0, window.innerWidth || 1200);
    const height = Math.max(container.clientHeight || 0, window.innerHeight || 800);
    const farClip = is100x ? 45000 : 6000;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 5, farClip);

    const initialCamPos = is100x ? new THREE.Vector3(-1400, 3600, 6400) : new THREE.Vector3(-140, 360, 640);
    const initialTarget = is100x ? new THREE.Vector3(0, 480, 0) : new THREE.Vector3(0, 85, 0);
    this.camera.position.copy(initialCamPos);
    this.targetCameraPos.copy(initialCamPos);
    this.targetLookAt.copy(initialTarget);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    // Cap pixel ratio at 1.5 for silky smooth GPU rendering without quality loss on Retina displays
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.renderer.domElement.id = 'wildfire-3d-canvas';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // 3. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03; // Don't clip under ground
    this.controls.minDistance = is100x ? 200 : 40;
    this.controls.maxDistance = is100x ? 26000 : 2400;
    this.controls.target.copy(initialTarget);

    // 4. Lights
    // Ambient light provides base illumination so mountain canyons are legible
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(this.ambientLight);

    // Hemisphere light adds natural sky/ground gradient illumination
    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x3d3830, 0.75);
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.85);
    const lightDist = is100x ? 10 : 1;
    this.dirLight.position.set(450 * lightDist, 750 * lightDist, 350 * lightDist);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.bias = 0.0002;
    this.dirLight.shadow.normalBias = 0.06;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = is100x ? 25000 : 2400;
    const d = is100x ? 6500 : 650; // Envelope mountain range
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Dynamic fire point lights (flickering orange glows on mountain terrain)
    const fireLightDist = is100x ? 3400 : 420;
    this.fireLight1 = new THREE.PointLight(0xff5500, 0, fireLightDist, 1.3);
    this.fireLight1.position.set(0, 60, 0);
    this.scene.add(this.fireLight1);

    this.fireLight2 = new THREE.PointLight(0xff8800, 0, fireLightDist * 0.8, 1.5);
    this.fireLight2.position.set(0, 60, 0);
    this.scene.add(this.fireLight2);

    this.fireLight3 = new THREE.PointLight(0xff3300, 0, fireLightDist * 0.65, 1.4);
    this.fireLight3.position.set(0, 60, 0);
    this.scene.add(this.fireLight3);

    // Initialize lighting environment immediately
    this.setLightingMode('day');

    // 5. Add Meshes
    this.scene.add(this.terrain.group);
    this.scene.add(this.fireParticles.group);

    // 6. Interactive Click Reticle (Tactical Targeting Cursor)
    this.reticleMesh = new THREE.Group();

    // Outer ring sized for mountain scale
    const ringInner = is100x ? 55.0 : 7.0;
    const ringOuter = is100x ? 76.0 : 9.2;
    const reticleGeo = new THREE.RingGeometry(ringInner, ringOuter, 32);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.reticleRing = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticleMesh.add(this.reticleRing);

    // Inner pulsing target dot
    const dotRadius = is100x ? 22.0 : 2.8;
    const centerDotGeo = new THREE.CircleGeometry(dotRadius, 16);
    centerDotGeo.rotateX(-Math.PI / 2);
    const centerDotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.reticlePulse = new THREE.Mesh(centerDotGeo, centerDotMat);
    this.reticleMesh.add(this.reticlePulse);

    this.reticleMesh.position.set(0, -1000, 0);
    this.scene.add(this.reticleMesh);

    // Pointer event listeners with drag threshold check
    const onPointerDown = (event: PointerEvent) => {
      this.pointerDownPos.x = event.clientX;
      this.pointerDownPos.y = event.clientY;
    };

    const onPointerUp = (event: PointerEvent) => {
      const dx = event.clientX - this.pointerDownPos.x;
      const dy = event.clientY - this.pointerDownPos.y;
      // If moved less than 6px, this is a clean click, not a camera orbit drag!
      if (Math.hypot(dx, dy) < 6) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain.terrainMesh);
        if (intersects.length > 0) {
          const pt = intersects[0].point;
          onIgniteClick(pt.x, pt.z);
        }
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.terrain.terrainMesh);
      if (intersects.length > 0) {
        const pt = intersects[0].point;
        this.reticleMesh.position.set(pt.x, pt.y + 0.6, pt.z);
        this.reticleMesh.visible = true;
      } else {
        this.reticleMesh.visible = false;
      }
    };

    this.renderer.domElement.addEventListener('pointerdown', onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', onPointerMove);
  }

  public setLightingMode(mode: LightingMode) {
    this.currentLighting = mode;
    const fog = this.scene.fog as THREE.FogExp2;
    const is100x = this.terrain.config.scaleMode === '100x';
    const densityFactor = is100x ? 0.11 : 1.0;

    if (mode === 'dusk') {
      // Warm sunset sky & rich mountain illumination
      this.scene.background = new THREE.Color(0x56384a);
      fog.color.setHex(0x6b4859);
      fog.density = 0.00032 * densityFactor;
      this.ambientLight.color.setHex(0xf3cca3);
      this.ambientLight.intensity = 1.2;
      this.dirLight.color.setHex(0xff9944);
      this.dirLight.intensity = 1.8;
      const lightDist = is100x ? 10 : 1;
      this.dirLight.position.set(-450 * lightDist, 420 * lightDist, 320 * lightDist);
      this.renderer.toneMappingExposure = 1.25;
    } else if (mode === 'night') {
      // Deep midnight indigo sky with glowing moonlit mountains
      this.scene.background = new THREE.Color(0x111a2e);
      fog.color.setHex(0x19253d);
      fog.density = 0.00040 * densityFactor;
      this.ambientLight.color.setHex(0x738cb8);
      this.ambientLight.intensity = 0.95;
      this.dirLight.color.setHex(0x8faee0);
      this.dirLight.intensity = 1.15;
      const lightDist = is100x ? 10 : 1;
      this.dirLight.position.set(380 * lightDist, 550 * lightDist, 360 * lightDist);
      this.renderer.toneMappingExposure = 1.4;
    } else {
      // Crisp sunny day sky with vast mountain ridges
      this.scene.background = new THREE.Color(0x6ca3d8);
      fog.color.setHex(0x90bce2);
      fog.density = 0.00025 * densityFactor;
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 1.35;
      this.dirLight.color.setHex(0xfffaed);
      this.dirLight.intensity = 1.95;
      const lightDist = is100x ? 10 : 1;
      this.dirLight.position.set(450 * lightDist, 750 * lightDist, 350 * lightDist);
      this.renderer.toneMappingExposure = 1.2;
    }
  }

  public setCameraPreset(preset: CameraPreset, fireFrontCenter?: { x: number; y: number; z: number }) {
    this.currentCameraPreset = preset;
    const is100x = this.terrain.config.scaleMode === '100x';

    if (preset === 'orbit') {
      if (is100x) {
        this.targetCameraPos.set(-1400, 3600, 6400);
        this.targetLookAt.set(0, 480, 0);
      } else {
        this.targetCameraPos.set(-140, 360, 640);
        this.targetLookAt.set(0, 85, 0);
      }
    } else if (preset === 'top_down') {
      if (is100x) {
        this.targetCameraPos.set(0, 13000, 1);
        this.targetLookAt.set(0, 0, 0);
      } else {
        this.targetCameraPos.set(0, 1250, 1);
        this.targetLookAt.set(0, 0, 0);
      }
    } else if (preset === 'track_front' && fireFrontCenter) {
      if (is100x) {
        this.targetCameraPos.set(fireFrontCenter.x + 850, fireFrontCenter.y + 600, fireFrontCenter.z + 1100);
        this.targetLookAt.set(fireFrontCenter.x, fireFrontCenter.y, fireFrontCenter.z);
      } else {
        this.targetCameraPos.set(fireFrontCenter.x + 110, fireFrontCenter.y + 80, fireFrontCenter.z + 140);
        this.targetLookAt.set(fireFrontCenter.x, fireFrontCenter.y, fireFrontCenter.z);
      }
    }
  }

  public updateTerrainMesh(newTerrain: TerrainMesh, resetCamera: boolean = false) {
    this.scene.remove(this.terrain.group);
    this.terrain.dispose();
    this.terrain = newTerrain;
    this.scene.add(this.terrain.group);

    const is100x = newTerrain.config.scaleMode === '100x';
    this.camera.far = is100x ? 45000 : 6000;
    this.camera.updateProjectionMatrix();

    this.controls.minDistance = is100x ? 200 : 40;
    this.controls.maxDistance = is100x ? 26000 : 2400;

    const fireLightDist = is100x ? 3400 : 420;
    this.fireLight1.distance = fireLightDist;
    this.fireLight2.distance = fireLightDist * 0.8;
    this.fireLight3.distance = fireLightDist * 0.65;

    // Refresh reticle sizing
    this.scene.remove(this.reticleMesh);
    this.reticleMesh = new THREE.Group();
    const ringInner = is100x ? 55.0 : 7.0;
    const ringOuter = is100x ? 76.0 : 9.2;
    const reticleGeo = new THREE.RingGeometry(ringInner, ringOuter, 32);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.reticleRing = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticleMesh.add(this.reticleRing);

    const dotRadius = is100x ? 22.0 : 2.8;
    const centerDotGeo = new THREE.CircleGeometry(dotRadius, 16);
    centerDotGeo.rotateX(-Math.PI / 2);
    const centerDotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.reticlePulse = new THREE.Mesh(centerDotGeo, centerDotMat);
    this.reticleMesh.add(this.reticlePulse);
    this.reticleMesh.position.set(0, -1000, 0);
    this.scene.add(this.reticleMesh);

    // Apply lighting & camera preset for new scale
    this.setLightingMode(this.currentLighting);
    if (resetCamera) {
      this.setCameraPreset('orbit');
      this.camera.position.copy(this.targetCameraPos);
      this.controls.target.copy(this.targetLookAt);
      this.controls.update();
    }
  }

  public updateTerrainScale(newTerrain: TerrainMesh) {
    this.updateTerrainMesh(newTerrain, true);
  }

  public update(
    dt: number,
    firePoints: FireFrontPoint[],
    fireFrontCenter: { x: number; y: number; z: number },
    weather: WeatherConditions
  ) {
    const is100x = this.terrain.config.scaleMode === '100x';

    // 1. Fire dynamic lighting
    if (firePoints.length > 0) {
      const flicker = 0.85 + Math.sin(Date.now() * 0.018) * 0.15 + Math.random() * 0.12;
      const intensity = Math.min(is100x ? 240.0 : 32.0, (is100x ? 45.0 : 6.0) + Math.sqrt(firePoints.length) * (is100x ? 12.0 : 1.8)) * flicker;

      this.fireLight1.position.set(fireFrontCenter.x, fireFrontCenter.y + (is100x ? 50.0 : 8.0), fireFrontCenter.z);
      this.fireLight1.intensity = intensity;

      if (firePoints.length > 2) {
        const altPoint = firePoints[Math.floor(firePoints.length * 0.4)];
        this.fireLight2.position.set(altPoint.x, altPoint.y + (is100x ? 45.0 : 7.0), altPoint.z);
        this.fireLight2.intensity = intensity * 0.85;
      } else {
        this.fireLight2.intensity = 0;
      }

      if (firePoints.length > 6) {
        const altPoint2 = firePoints[Math.floor(firePoints.length * 0.8)];
        this.fireLight3.position.set(altPoint2.x, altPoint2.y + (is100x ? 45.0 : 7.0), altPoint2.z);
        this.fireLight3.intensity = intensity * 0.75;
      } else {
        this.fireLight3.intensity = 0;
      }
    } else {
      this.fireLight1.intensity = 0;
      this.fireLight2.intensity = 0;
      this.fireLight3.intensity = 0;
    }

    // 2. Camera transition if tracking
    if (this.currentCameraPreset === 'track_front' && firePoints.length > 0) {
      this.targetLookAt.set(fireFrontCenter.x, fireFrontCenter.y, fireFrontCenter.z);
      const camOffset = is100x
        ? { x: 850, y: 600, z: 1100 }
        : { x: 110, y: 80, z: 140 };
      this.targetCameraPos.set(
        fireFrontCenter.x + camOffset.x,
        fireFrontCenter.y + camOffset.y,
        fireFrontCenter.z + camOffset.z
      );
    }

    if (this.currentCameraPreset !== 'orbit') {
      this.camera.position.lerp(this.targetCameraPos, dt * 2.5);
      this.controls.target.lerp(this.targetLookAt, dt * 2.5);
    }

    // Reticle pulse
    if (this.reticleMesh.visible) {
      const s = 1.0 + Math.sin(Date.now() * 0.008) * 0.15;
      this.reticleMesh.scale.set(s, s, s);
    }

    this.controls.update();

    // 3. Update particle systems
    this.fireParticles.update(dt, firePoints, weather);

    // 4. Render
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.renderer.dispose();
  }
}

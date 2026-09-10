import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FireFrontPoint, WeatherConditions } from '../types';

export class FireParticleSystem {
  public group: THREE.Group;

  // 1. 3D Flame Column Meshes (입체 화염 메쉬 - 십자 빌보드)
  private flameColumnsMesh: THREE.InstancedMesh;
  private maxColumns = 500;
  private dummyMatrix = new THREE.Matrix4();
  private dummyColor = new THREE.Color();
  private flameTime = 0;

  // 2. Volumetric Flame Particles
  private flameParticles: THREE.Points;
  private flameGeo: THREE.BufferGeometry;
  private flamePositions: Float32Array;
  private flameColors: Float32Array;
  private flameVelocities: Float32Array;
  private flameLifes: Float32Array;
  private maxFlames = 4200;

  // 3. Smoke Particles
  private smokeParticles: THREE.Points;
  private smokeGeo: THREE.BufferGeometry;
  private smokePositions: Float32Array;
  private smokeVelocities: Float32Array;
  private smokeLifes: Float32Array;
  private maxSmoke = 4800;

  // 4. Embers / Sparks
  private emberParticles: THREE.Points;
  private emberGeo: THREE.BufferGeometry;
  private emberPositions: Float32Array;
  private emberVelocities: Float32Array;
  private emberLifes: Float32Array;
  private maxEmbers = 1600;

  constructor() {
    this.group = new THREE.Group();

    // 1. Generate procedural particle textures
    const flameTexture = this.createFlameTexture();
    const smokeTexture = this.createSmokeTexture();
    const emberTexture = this.createEmberTexture();

    // 2. Setup 3D Flame Column Meshes (Crossed Quads)
    const quadGeom1 = new THREE.PlaneGeometry(6.5, 14.0);
    quadGeom1.translate(0, 7.0, 0); // Pivot at ground
    const quadGeom2 = new THREE.PlaneGeometry(6.5, 14.0);
    quadGeom2.translate(0, 7.0, 0);
    quadGeom2.rotateY(Math.PI / 2);

    // Merge into crossed X geometry with valid indices & normals
    const colGeom = mergeGeometries([quadGeom1, quadGeom2]) || quadGeom1;

    const colMat = new THREE.MeshBasicMaterial({
      map: flameTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.flameColumnsMesh = new THREE.InstancedMesh(colGeom, colMat, this.maxColumns);
    this.flameColumnsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < this.maxColumns; i++) {
      this.dummyMatrix.makeTranslation(0, -1000, 0);
      this.flameColumnsMesh.setMatrixAt(i, this.dummyMatrix);
    }
    this.flameColumnsMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.flameColumnsMesh);

    // 3. Setup Volumetric Flame Particle Buffer
    this.flameGeo = new THREE.BufferGeometry();
    this.flamePositions = new Float32Array(this.maxFlames * 3);
    this.flameColors = new Float32Array(this.maxFlames * 3);
    this.flameVelocities = new Float32Array(this.maxFlames * 3);
    this.flameLifes = new Float32Array(this.maxFlames);

    for (let i = 0; i < this.maxFlames; i++) {
      this.flamePositions[i * 3 + 1] = -1000;
      this.flameLifes[i] = 0;
    }

    this.flameGeo.setAttribute('position', new THREE.BufferAttribute(this.flamePositions, 3));
    this.flameGeo.setAttribute('color', new THREE.BufferAttribute(this.flameColors, 3));

    const flameMat = new THREE.PointsMaterial({
      size: 46.0,
      map: flameTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });
    this.flameParticles = new THREE.Points(this.flameGeo, flameMat);
    this.group.add(this.flameParticles);

    // 4. Setup Smoke Particle Buffer
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(this.maxSmoke * 3);
    this.smokeVelocities = new Float32Array(this.maxSmoke * 3);
    this.smokeLifes = new Float32Array(this.maxSmoke);

    for (let i = 0; i < this.maxSmoke; i++) {
      this.smokePositions[i * 3 + 1] = -1000;
      this.smokeLifes[i] = 0;
    }

    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));

    const smokeMat = new THREE.PointsMaterial({
      size: 110.0,
      map: smokeTexture,
      transparent: true,
      opacity: 0.52,
      color: 0x48423d,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.smokeParticles = new THREE.Points(this.smokeGeo, smokeMat);
    this.group.add(this.smokeParticles);

    // 5. Setup Embers Particle Buffer
    this.emberGeo = new THREE.BufferGeometry();
    this.emberPositions = new Float32Array(this.maxEmbers * 3);
    this.emberVelocities = new Float32Array(this.maxEmbers * 3);
    this.emberLifes = new Float32Array(this.maxEmbers);

    for (let i = 0; i < this.maxEmbers; i++) {
      this.emberPositions[i * 3 + 1] = -1000;
      this.emberLifes[i] = 0;
    }

    this.emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    const emberMat = new THREE.PointsMaterial({
      size: 8.5,
      map: emberTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      color: 0xffbb44,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.emberParticles = new THREE.Points(this.emberGeo, emberMat);
    this.group.add(this.emberParticles);
  }

  private createFlameTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Rich multi-layer flame gradient
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');     // Pure white hot core
    grad.addColorStop(0.18, 'rgba(255, 235, 90, 0.95)');  // Brilliant golden yellow
    grad.addColorStop(0.42, 'rgba(255, 130, 20, 0.85)');  // Intense fiery orange
    grad.addColorStop(0.72, 'rgba(240, 45, 5, 0.45)');    // Blazing crimson
    grad.addColorStop(0.95, 'rgba(160, 20, 0, 0.12)');    // Dark ember rim
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  private createSmokeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(65, 60, 56, 0.85)');       // Charcoal core
    grad.addColorStop(0.35, 'rgba(95, 90, 85, 0.6)');      // Soft ash body
    grad.addColorStop(0.7, 'rgba(135, 130, 125, 0.28)');  // Dispersing vapor
    grad.addColorStop(1, 'rgba(160, 155, 150, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  private createEmberTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(255, 200, 60, 0.95)');
    grad.addColorStop(0.65, 'rgba(255, 90, 10, 0.5)');
    grad.addColorStop(1, 'rgba(255, 50, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  public update(dt: number, firePoints: FireFrontPoint[], weather: WeatherConditions) {
    this.flameTime += dt;
    const windRad = (weather.wind.direction * Math.PI) / 180;
    const windDirX = Math.sin(windRad) * (weather.wind.speed * 0.25);
    const windDirZ = -Math.cos(windRad) * (weather.wind.speed * 0.25);

    const hasFires = firePoints.length > 0;

    // 1. UPDATE 3D FLAME COLUMN MESHES
    const numColumns = Math.min(this.maxColumns, firePoints.length);
    for (let i = 0; i < this.maxColumns; i++) {
      if (i < numColumns) {
        const p = firePoints[i];
        // Dynamic flame flicker & thermal stretch
        const flicker = 0.8 + 0.35 * Math.sin(this.flameTime * 14 + i * 2.1) + 0.15 * Math.cos(this.flameTime * 22 + i);
        const scaleX = (1.0 + p.intensity * 0.6) * flicker;
        const scaleY = (1.2 + p.intensity * 1.5) * flicker;
        const scaleZ = (1.0 + p.intensity * 0.6) * flicker;

        // Lean slightly with wind
        const tiltX = windDirX * 0.08;
        const tiltZ = windDirZ * 0.08;

        this.dummyMatrix.makeRotationY(this.flameTime * 1.2 + i * 0.5);
        this.dummyMatrix.scale(new THREE.Vector3(scaleX, scaleY, scaleZ));
        this.dummyMatrix.setPosition(p.x + tiltX * 2, p.y + 0.3, p.z + tiltZ * 2);
        this.flameColumnsMesh.setMatrixAt(i, this.dummyMatrix);
      } else {
        this.dummyMatrix.makeTranslation(0, -1000, 0);
        this.flameColumnsMesh.setMatrixAt(i, this.dummyMatrix);
      }
    }
    this.flameColumnsMesh.instanceMatrix.needsUpdate = true;

    // 2. UPDATE VOLUMETRIC FLAME PARTICLES
    let flameSpawnIndex = 0;
    for (let i = 0; i < this.maxFlames; i++) {
      if (this.flameLifes[i] > 0) {
        this.flameLifes[i] -= dt * (1.6 + Math.random() * 0.6);

        // Movement: rapid rise + wind drift + thermal turbulence
        this.flamePositions[i * 3] += (this.flameVelocities[i * 3] + windDirX * 0.5) * dt;
        this.flamePositions[i * 3 + 1] += this.flameVelocities[i * 3 + 1] * dt;
        this.flamePositions[i * 3 + 2] += (this.flameVelocities[i * 3 + 2] + windDirZ * 0.5) * dt;

        // Color transition over particle lifespan
        const lifeNorm = Math.max(0, this.flameLifes[i]);
        const cIdx = i * 3;
        if (lifeNorm > 0.65) {
          // White-hot yellow core
          this.flameColors[cIdx] = 1.0;
          this.flameColors[cIdx + 1] = 0.95;
          this.flameColors[cIdx + 2] = 0.7;
        } else if (lifeNorm > 0.3) {
          // Brilliant fiery orange
          this.flameColors[cIdx] = 1.0;
          this.flameColors[cIdx + 1] = 0.45 * lifeNorm + 0.15;
          this.flameColors[cIdx + 2] = 0.05;
        } else {
          // Deep crimson
          this.flameColors[cIdx] = 0.9 * lifeNorm;
          this.flameColors[cIdx + 1] = 0.1 * lifeNorm;
          this.flameColors[cIdx + 2] = 0.01;
        }

        if (this.flameLifes[i] <= 0) {
          this.flamePositions[i * 3 + 1] = -1000;
        }
      } else if (hasFires && flameSpawnIndex < this.maxFlames) {
        // Spawn flame at active fire node
        const p = firePoints[flameSpawnIndex % firePoints.length];
        flameSpawnIndex += 1;

        this.flamePositions[i * 3] = p.x + (Math.random() - 0.5) * 2.8;
        this.flamePositions[i * 3 + 1] = p.y + Math.random() * 1.5;
        this.flamePositions[i * 3 + 2] = p.z + (Math.random() - 0.5) * 2.8;

        this.flameVelocities[i * 3] = (Math.random() - 0.5) * 2.0;
        this.flameVelocities[i * 3 + 1] = 4.0 + Math.random() * 5.0; // Updraft
        this.flameVelocities[i * 3 + 2] = (Math.random() - 0.5) * 2.0;

        this.flameLifes[i] = 0.65 + Math.random() * 0.55;
      }
    }
    (this.flameGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.flameGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    // 3. UPDATE SMOKE PLUME
    let smokeSpawnIndex = 0;
    for (let i = 0; i < this.maxSmoke; i++) {
      if (this.smokeLifes[i] > 0) {
        this.smokeLifes[i] -= dt * 0.22; // Smoke persists long, building massive plume

        // Smoke climbs high and billows far downwind
        this.smokePositions[i * 3] += (this.smokeVelocities[i * 3] + windDirX * 1.4) * dt;
        this.smokePositions[i * 3 + 1] += this.smokeVelocities[i * 3 + 1] * dt;
        this.smokePositions[i * 3 + 2] += (this.smokeVelocities[i * 3 + 2] + windDirZ * 1.4) * dt;

        // Dispersion turbulence
        this.smokeVelocities[i * 3] += (Math.random() - 0.5) * 0.25 * dt;
        this.smokeVelocities[i * 3 + 2] += (Math.random() - 0.5) * 0.25 * dt;

        if (this.smokeLifes[i] <= 0) {
          this.smokePositions[i * 3 + 1] = -1000;
        }
      } else if (hasFires && smokeSpawnIndex < this.maxSmoke) {
        const p = firePoints[smokeSpawnIndex % firePoints.length];
        smokeSpawnIndex += 1;

        this.smokePositions[i * 3] = p.x + (Math.random() - 0.5) * 3.5;
        this.smokePositions[i * 3 + 1] = p.y + 3.0 + Math.random() * 3.0;
        this.smokePositions[i * 3 + 2] = p.z + (Math.random() - 0.5) * 3.5;

        this.smokeVelocities[i * 3] = (Math.random() - 0.5) * 2.0;
        this.smokeVelocities[i * 3 + 1] = 5.0 + Math.random() * 5.0; // High atmospheric climb
        this.smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 2.0;

        this.smokeLifes[i] = 1.0;
      }
    }
    (this.smokeGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // 4. UPDATE EMBERS / SPARKS
    let emberSpawnIndex = 0;
    for (let i = 0; i < this.maxEmbers; i++) {
      if (this.emberLifes[i] > 0) {
        this.emberLifes[i] -= dt * 0.75;

        this.emberPositions[i * 3] += (this.emberVelocities[i * 3] + windDirX * 2.4) * dt;
        this.emberPositions[i * 3 + 1] += this.emberVelocities[i * 3 + 1] * dt;
        this.emberPositions[i * 3 + 2] += (this.emberVelocities[i * 3 + 2] + windDirZ * 2.4) * dt;

        this.emberVelocities[i * 3 + 1] -= dt * 3.0; // Gravity

        if (this.emberLifes[i] <= 0) {
          this.emberPositions[i * 3 + 1] = -1000;
        }
      } else if (hasFires && emberSpawnIndex < this.maxEmbers) {
        const p = firePoints[emberSpawnIndex % firePoints.length];
        emberSpawnIndex += 1;

        this.emberPositions[i * 3] = p.x + (Math.random() - 0.5) * 2.0;
        this.emberPositions[i * 3 + 1] = p.y + 2.0 + Math.random() * 2.0;
        this.emberPositions[i * 3 + 2] = p.z + (Math.random() - 0.5) * 2.0;

        this.emberVelocities[i * 3] = (Math.random() - 0.5) * 5.0;
        this.emberVelocities[i * 3 + 1] = 7.0 + Math.random() * 9.0; // Violent updraft eruption
        this.emberVelocities[i * 3 + 2] = (Math.random() - 0.5) * 5.0;

        this.emberLifes[i] = 0.9 + Math.random() * 1.1;
      }
    }
    (this.emberGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public clear() {
    this.reset();
  }

  public reset() {
    for (let i = 0; i < this.maxColumns; i++) {
      this.dummyMatrix.makeTranslation(0, -1000, 0);
      this.flameColumnsMesh.setMatrixAt(i, this.dummyMatrix);
    }
    this.flameColumnsMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.maxFlames; i++) {
      this.flamePositions[i * 3 + 1] = -1000;
      this.flameLifes[i] = 0;
    }
    for (let i = 0; i < this.maxSmoke; i++) {
      this.smokePositions[i * 3 + 1] = -1000;
      this.smokeLifes[i] = 0;
    }
    for (let i = 0; i < this.maxEmbers; i++) {
      this.emberPositions[i * 3 + 1] = -1000;
      this.emberLifes[i] = 0;
    }
    (this.flameGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.smokeGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.emberGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

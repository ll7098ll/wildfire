import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CellStatus, TerrainCell } from '../types';
import { DEFAULT_TERRAIN_CONFIG, TerrainConfig } from '../simulation/terrainData';

export class TerrainMesh {
  public group: THREE.Group;
  public terrainMesh: THREE.Mesh;
  public config: TerrainConfig;
  private geometry: THREE.PlaneGeometry;
  private colorsAttr: THREE.BufferAttribute;
  private treeMesh: THREE.InstancedMesh;
  private treeData: { x: number; y: number; z: number; scale: number; gridX: number; gridZ: number }[];
  private dummyMatrix = new THREE.Matrix4();
  private dummyColor = new THREE.Color();

  // Color palettes: rich mountain forest floor beneath the dense tree canopy
  private colorValley = new THREE.Color(0x1a4520); // Deep lush valley forest floor
  private colorForest = new THREE.Color(0x27552c); // Mountain pine forest floor
  private colorMidSlope = new THREE.Color(0x36633a); // Mid-slope spruce forest floor
  private colorUpperSlope = new THREE.Color(0x456c3f); // Upper subalpine conifer belt
  private colorHighRidge = new THREE.Color(0x56724a); // Alpine crest conifer woodland
  private colorAlpinePeak = new THREE.Color(0x667657); // Mountain summit conifer floor
  private colorCliffRock = new THREE.Color(0x485149); // Steep wooded rocky slope
  private colorBurning = new THREE.Color(0xff4500);
  private colorBurned = new THREE.Color(0x221e1c);
  private colorAsh = new THREE.Color(0x44403e);
  private tempColor = new THREE.Color();

  private baseColors: Float32Array;
  private cellStatus: Uint8Array;
  private treesByCell: number[][];
  private treeStates: Uint8Array; // 0: unburned, 1: burning, 2: burned

  constructor(
    grid: TerrainCell[][],
    heights: Float32Array,
    treePositions: { x: number; y: number; z: number; scale: number; gridX: number; gridZ: number }[],
    config: TerrainConfig = DEFAULT_TERRAIN_CONFIG
  ) {
    this.group = new THREE.Group();
    this.treeData = treePositions;
    this.config = config;

    const { worldSize, gridSize, maxHeight } = config;

    // 1. Terrain Geometry
    this.geometry = new THREE.PlaneGeometry(worldSize, worldSize, gridSize - 1, gridSize - 1);
    this.geometry.rotateX(-Math.PI / 2);

    const posAttr = this.geometry.attributes.position;
    const vertexColors = new Float32Array(posAttr.count * 3);

    // Apply elevation and realistic mountain biome & slope coloration
    for (let i = 0; i < posAttr.count; i++) {
      const x = i % gridSize;
      const z = Math.floor(i / gridSize);
      const h = heights[z * gridSize + x] || 0;
      const cell = grid[z]?.[x];
      const slope = cell ? Math.hypot(cell.slopeX, cell.slopeZ) : 0;

      // Set Y elevation
      posAttr.setY(i, h);

      // Height and slope-based alpine coloration
      const normH = h / maxHeight;
      const col = this.getTerrainColor(normH, slope);

      vertexColors[i * 3] = col.r;
      vertexColors[i * 3 + 1] = col.g;
      vertexColors[i * 3 + 2] = col.b;
    }

    // Cache immutable base unburned colors to prevent recalculations
    this.baseColors = new Float32Array(vertexColors);
    this.cellStatus = new Uint8Array(gridSize * gridSize);

    posAttr.needsUpdate = true;
    this.geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
    this.geometry.computeVertexNormals();
    this.colorsAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.06,
      flatShading: false,
    });

    this.terrainMesh = new THREE.Mesh(this.geometry, terrainMaterial);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = false;
    this.group.add(this.terrainMesh);

    // 2. Instanced Pine Trees
    const treeGeo = this.createTreeGeometry();
    const treeMat = new THREE.MeshLambertMaterial({
      reflectivity: 0.12,
    });

    this.treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, treePositions.length);
    this.treeMesh.castShadow = true;
    // Optimize GPU fill-rate: trees do not need to receive self-shadows
    this.treeMesh.receiveShadow = false;

    // Index trees by grid cell for instant O(1) lookups
    const totalCells = gridSize * gridSize;
    this.treesByCell = new Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      this.treesByCell[i] = [];
    }

    this.treeStates = new Uint8Array(treePositions.length);

    // Initialize tree transforms with natural forest color variations
    for (let i = 0; i < treePositions.length; i++) {
      const t = treePositions[i];
      const cellIdx = t.gridZ * gridSize + t.gridX;
      if (cellIdx >= 0 && cellIdx < totalCells) {
        this.treesByCell[cellIdx].push(i);
      }

      this.dummyMatrix.makeTranslation(t.x, t.y, t.z);
      this.dummyMatrix.scale(new THREE.Vector3(t.scale, t.scale, t.scale));
      this.treeMesh.setMatrixAt(i, this.dummyMatrix);
      this.dummyColor.setHex(this.getTreeInitialColor(i, t));
      this.treeMesh.setColorAt(i, this.dummyColor);
    }
    this.treeMesh.instanceMatrix.needsUpdate = true;
    if (this.treeMesh.instanceColor) this.treeMesh.instanceColor.needsUpdate = true;
    this.group.add(this.treeMesh);
  }

  private getTerrainColor(normH: number, slope: number): THREE.Color {
    const out = this.tempColor;
    if (normH < 0.22) {
      // Valley riverbed basin
      out.copy(this.colorValley);
    } else if (normH < 0.45) {
      // Foothill and lower pine forest
      const t = (normH - 0.22) / (0.45 - 0.22);
      out.copy(this.colorValley).lerp(this.colorForest, t);
    } else if (normH < 0.65) {
      // Mid mountain evergreen conifer slope
      const t = (normH - 0.45) / (0.65 - 0.45);
      out.copy(this.colorForest).lerp(this.colorMidSlope, t);
    } else if (normH < 0.80) {
      // Upper subalpine ridge
      const t = (normH - 0.65) / (0.80 - 0.65);
      out.copy(this.colorMidSlope).lerp(this.colorHighRidge, t);
    } else {
      // Alpine crags and towering mountain peaks
      const t = Math.min(1.0, (normH - 0.80) / 0.18);
      out.copy(this.colorHighRidge).lerp(this.colorAlpinePeak, t);
    }

    // Geological slope factor: Earthy wooded rock shading to accent 3D slope contours
    if (slope > 0.40) {
      const rockFactor = Math.min(0.65, (slope - 0.40) * 2.2);
      out.lerp(this.colorCliffRock, rockFactor);
    }

    return out;
  }

  private getTreeInitialColor(index: number, t: { x: number; y: number; z: number }): number {
    const hash = Math.abs(Math.sin(index * 12.9898 + t.x * 0.1 + t.z * 0.1) * 43758.5453) % 1;
    if (hash < 0.28) {
      return 0x224e25; // Deep coniferous pine
    } else if (hash < 0.58) {
      return 0x295a2d; // Rich evergreen spruce
    } else if (hash < 0.84) {
      return 0x326836; // Alpine fir
    } else {
      return 0x3c7741; // Lush valley woodland
    }
  }

  private createTreeGeometry(): THREE.BufferGeometry {
    // Stylized tiered evergreen pine tree scaled for the grand mountain range
    // Lower fuller canopy
    const lowerFoliage = new THREE.ConeGeometry(2.4, 4.4, 5);
    lowerFoliage.translate(0, 3.8, 0);

    // Upper conical peak
    const upperFoliage = new THREE.ConeGeometry(1.6, 4.2, 5);
    upperFoliage.translate(0, 6.2, 0);

    // Tree trunk extending into the ground to anchor securely on mountain slopes
    const trunk = new THREE.CylinderGeometry(0.35, 0.55, 2.2, 5);
    trunk.translate(0, 0.7, 0);

    const merged = mergeGeometries([lowerFoliage, upperFoliage, trunk]) || lowerFoliage;
    merged.computeVertexNormals();
    return merged;
  }

  public updateFromGrid(grid: TerrainCell[][]) {
    const colors = this.colorsAttr.array as Float32Array;
    const { gridSize } = this.config;

    let terrainColorsChanged = false;
    let treesChanged = false;

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const idx = z * gridSize + x;
        const cell = grid[z][x];
        const status = cell.status;
        const prevStatus = this.cellStatus[idx];

        // 1. Pristine Unburned (0): Base colors are already in place
        if (status === CellStatus.UNBURNED) {
          if (prevStatus !== 0) {
            colors[idx * 3] = this.baseColors[idx * 3];
            colors[idx * 3 + 1] = this.baseColors[idx * 3 + 1];
            colors[idx * 3 + 2] = this.baseColors[idx * 3 + 2];
            this.cellStatus[idx] = 0;
            terrainColorsChanged = true;
          }
          continue;
        }

        // 2. Permanently Burned (2): Charred ash written ONCE
        if (status === CellStatus.BURNED) {
          if (prevStatus !== 2) {
            const ash = 0.07 + (((x * 17 + z * 31) % 10) / 10) * 0.07;
            colors[idx * 3] = ash * 1.05;
            colors[idx * 3 + 1] = ash;
            colors[idx * 3 + 2] = ash * 0.95;
            this.cellStatus[idx] = 2;
            terrainColorsChanged = true;

            // Transition trees on this cell to permanently burned stumps
            const cellTrees = this.treesByCell[idx];
            if (cellTrees) {
              for (let j = 0; j < cellTrees.length; j++) {
                const treeIdx = cellTrees[j];
                if (this.treeStates[treeIdx] !== 2) {
                  const t = this.treeData[treeIdx];
                  const stumpScale = t.scale * 0.28;
                  this.dummyMatrix.makeTranslation(t.x, t.y, t.z);
                  this.dummyMatrix.scale(new THREE.Vector3(stumpScale, stumpScale, stumpScale));
                  this.treeMesh.setMatrixAt(treeIdx, this.dummyMatrix);

                  this.dummyColor.setHex(0x1a1614);
                  this.treeMesh.setColorAt(treeIdx, this.dummyColor);
                  this.treeStates[treeIdx] = 2;
                  treesChanged = true;
                }
              }
            }
          }
          // Already burned and trees collapsed. Skip subsequent frames completely!
          continue;
        }

        // 3. Actively BURNING (1)
        if (status === CellStatus.BURNING) {
          this.cellStatus[idx] = 1;
          terrainColorsChanged = true;

          const heat = cell.temperature;
          colors[idx * 3] = 1.0;
          colors[idx * 3 + 1] = Math.min(0.9, 0.25 + heat * 0.6);
          colors[idx * 3 + 2] = 0.04;

          // Animate trees on this actively burning cell
          const cellTrees = this.treesByCell[idx];
          if (cellTrees) {
            for (let j = 0; j < cellTrees.length; j++) {
              const treeIdx = cellTrees[j];
              const t = this.treeData[treeIdx];
              const remainingScale = Math.max(0.1, t.scale * (1.0 - cell.burnProgress * 0.7));
              this.dummyMatrix.makeTranslation(t.x, t.y, t.z);
              this.dummyMatrix.scale(new THREE.Vector3(remainingScale, remainingScale, remainingScale));
              this.treeMesh.setMatrixAt(treeIdx, this.dummyMatrix);

              this.dummyColor.setHex(0xff3300);
              this.treeMesh.setColorAt(treeIdx, this.dummyColor);
              this.treeStates[treeIdx] = 1;
              treesChanged = true;
            }
          }
        }
      }
    }

    if (terrainColorsChanged) {
      this.colorsAttr.needsUpdate = true;
    }

    if (treesChanged) {
      this.treeMesh.instanceMatrix.needsUpdate = true;
      if (this.treeMesh.instanceColor) this.treeMesh.instanceColor.needsUpdate = true;
    }
  }

  public resetTrees() {
    // Restore pristine base terrain vertex colors
    const colors = this.colorsAttr.array as Float32Array;
    colors.set(this.baseColors);
    this.colorsAttr.needsUpdate = true;
    this.cellStatus.fill(0);
    this.treeStates.fill(0);

    for (let i = 0; i < this.treeData.length; i++) {
      const t = this.treeData[i];
      this.dummyMatrix.makeTranslation(t.x, t.y, t.z);
      this.dummyMatrix.scale(new THREE.Vector3(t.scale, t.scale, t.scale));
      this.treeMesh.setMatrixAt(i, this.dummyMatrix);
      this.dummyColor.setHex(this.getTreeInitialColor(i, t));
      this.treeMesh.setColorAt(i, this.dummyColor);
    }
    this.treeMesh.instanceMatrix.needsUpdate = true;
    if (this.treeMesh.instanceColor) this.treeMesh.instanceColor.needsUpdate = true;
  }

  public dispose() {
    this.geometry.dispose();
    if (this.terrainMesh.material instanceof THREE.Material) {
      this.terrainMesh.material.dispose();
    }
    this.treeMesh.geometry.dispose();
    if (this.treeMesh.material instanceof THREE.Material) {
      this.treeMesh.material.dispose();
    }
  }
}

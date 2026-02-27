'use client';

import { useMemo, useRef, useState, Suspense, useEffect } from 'react';
import { Canvas, useThree, ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, Cylinder, Cone, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { PalaceRoomV2 } from '@/types';

interface MemoryItem {
  id: string;
  content: string;
  position: { x: number; y: number };
  image?: string;
  shape?: 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  height?: number;
}

interface Room {
  id: string;
  name: string;
  description: string;
  items: MemoryItem[];
  color: string;
}

type RoomInput = Room | PalaceRoomV2;

interface MemoryPalace3DProps {
  room: RoomInput;
  selectedItem: string | null;
  onSelectItem: (id: string | null) => void;
  onEditItem: (item: MemoryItem) => void;
  styleMode?: WorldStyleId;
  biomeId?: BiomeId;
  roomIndex?: number;
  roomCount?: number;
  onPortalNavigate?: (direction: PortalDirection) => void;
  onUpdateItem?: (itemId: string, data: { position?: { x: number; y: number }; size?: 'small' | 'medium' | 'large'; height?: number }) => void;
}

type WorldStyleId = 'cinematic' | 'voxel';
type BiomeId = 'academy' | 'desert' | 'snow' | 'nether';
type PortalDirection = 'prev' | 'next';

interface WorldStylePack {
  id: WorldStyleId;
  label: string;
  showFog: boolean;
  blockSnap: boolean;
  flatShading: boolean;
  pixelOverlayTone: string;
}

interface BiomePack {
  id: BiomeId;
  label: string;
  skyFrom: string;
  skyTo: string;
  tint: string;
  fogLift: string;
}

type RoomThemeId = 'library' | 'alchemist' | 'garden' | 'sanctum' | 'forge' | 'cavern';

type FloorPattern = 'radial' | 'cross' | 'aisle';

interface RoomLayout {
  pattern: FloorPattern;
  ringInner: number;
  ringOuter: number;
  sideWallOpacity: number;
  aisleHalfWidth: number;
  archWidth: number;
  archHeight: number;
  pillarScale: number;
  decorOffset: number;
  ceilingOpacity: number;
}

interface ExplorerPosition {
  x: number;
  z: number;
}

type CameraWaypointId = 'north' | 'south' | 'east' | 'west' | 'center';

interface SceneCameraCommand {
  id: CameraWaypointId;
  nonce: number;
}

interface ExplorerObstacle {
  x: number;
  z: number;
  radius: number;
}

interface LayoutObstacle extends ExplorerObstacle {
  id: string;
  height: number;
}

interface FootstepEntry {
  id: number;
  x: number;
  z: number;
}

interface RoomTheme {
  id: RoomThemeId;
  label: string;
  accent: string;
  floorColor: string;
  wallColor: string;
  wallGlow: string;
  fogColor: string;
  ambientIntensity: number;
  directionalIntensity: number;
  pointLights: Array<{ position: [number, number, number]; color: string; intensity: number }>;
  landmarkHints: string[];
  seed: number;
  layout: RoomLayout;
}

interface ThemeSpec extends Omit<RoomTheme, 'accent' | 'floorColor' | 'wallColor' | 'seed' | 'layout'> {}

const THEME_SPECS: Record<RoomThemeId, ThemeSpec> = {
  library: {
    id: 'library',
    label: '아케인 서고',
    wallGlow: '#c7d2fe',
    fogColor: '#f6f7ff',
    ambientIntensity: 0.52,
    directionalIntensity: 0.95,
    pointLights: [
      { position: [-4, 3.5, -2], color: '#fef3c7', intensity: 0.7 },
      { position: [4, 3.5, -2], color: '#bfdbfe', intensity: 0.45 },
    ],
    landmarkHints: ['고서 서가', '중앙 독서대', '청색 샹들리에'],
  },
  alchemist: {
    id: 'alchemist',
    label: '연금 실험실',
    wallGlow: '#99f6e4',
    fogColor: '#f3fffe',
    ambientIntensity: 0.5,
    directionalIntensity: 1.0,
    pointLights: [
      { position: [-3, 2.8, -3], color: '#22d3ee', intensity: 0.75 },
      { position: [3.2, 2.8, -3], color: '#34d399', intensity: 0.7 },
    ],
    landmarkHints: ['마법 가마솥', '포션 선반', '룬 원형진'],
  },
  garden: {
    id: 'garden',
    label: '달빛 정원',
    wallGlow: '#bbf7d0',
    fogColor: '#f6fff7',
    ambientIntensity: 0.6,
    directionalIntensity: 0.85,
    pointLights: [
      { position: [-4, 2.8, 1], color: '#86efac', intensity: 0.55 },
      { position: [4, 2.8, 1], color: '#a7f3d0', intensity: 0.55 },
    ],
    landmarkHints: ['중앙 분수', '석조 아치', '꽃 화단'],
  },
  sanctum: {
    id: 'sanctum',
    label: '기억의 성소',
    wallGlow: '#fde68a',
    fogColor: '#fffaf1',
    ambientIntensity: 0.48,
    directionalIntensity: 1.1,
    pointLights: [
      { position: [-3.5, 3, -2.5], color: '#fbbf24', intensity: 0.8 },
      { position: [3.5, 3, -2.5], color: '#f59e0b', intensity: 0.8 },
    ],
    landmarkHints: ['중앙 제단', '양측 수호상', '황금 문양'],
  },
  forge: {
    id: 'forge',
    label: '전장의 대장간',
    wallGlow: '#fecaca',
    fogColor: '#fff5f2',
    ambientIntensity: 0.45,
    directionalIntensity: 1.12,
    pointLights: [
      { position: [-2.5, 2.5, -2], color: '#fb7185', intensity: 0.85 },
      { position: [2.5, 2.5, -2], color: '#f97316', intensity: 0.85 },
    ],
    landmarkHints: ['불꽃 용광로', '모루 작업대', '무기 거치대'],
  },
  cavern: {
    id: 'cavern',
    label: '수정 동굴',
    wallGlow: '#c4b5fd',
    fogColor: '#f7f5ff',
    ambientIntensity: 0.44,
    directionalIntensity: 0.88,
    pointLights: [
      { position: [-3.5, 2.2, -1], color: '#a78bfa', intensity: 0.75 },
      { position: [3.5, 2.2, -1], color: '#818cf8', intensity: 0.75 },
    ],
    landmarkHints: ['수정 군집', '종유석 지대', '빛나는 균열'],
  },
};

const WORLD_STYLE_PACKS: Record<WorldStyleId, WorldStylePack> = {
  cinematic: {
    id: 'cinematic',
    label: '클래식',
    showFog: true,
    blockSnap: false,
    flatShading: false,
    pixelOverlayTone: 'rgba(248, 250, 252, 0.08)',
  },
  voxel: {
    id: 'voxel',
    label: 'VOXEL',
    showFog: false,
    blockSnap: true,
    flatShading: true,
    pixelOverlayTone: 'rgba(15, 23, 42, 0.16)',
  },
};

const BIOME_PACKS: Record<BiomeId, BiomePack> = {
  academy: {
    id: 'academy',
    label: '아카데미',
    skyFrom: '#c7e0ff',
    skyTo: '#f8fbff',
    tint: '#dbeafe',
    fogLift: '#f5f9ff',
  },
  desert: {
    id: 'desert',
    label: '사막 유적',
    skyFrom: '#fcd9a6',
    skyTo: '#fff7e8',
    tint: '#f59e0b',
    fogLift: '#fff1dc',
  },
  snow: {
    id: 'snow',
    label: '설원 요새',
    skyFrom: '#cfe6ff',
    skyTo: '#eff8ff',
    tint: '#93c5fd',
    fogLift: '#f4fbff',
  },
  nether: {
    id: 'nether',
    label: '화염 균열',
    skyFrom: '#4a0f0f',
    skyTo: '#120808',
    tint: '#ef4444',
    fogLift: '#2b0f0f',
  },
};

const CAMERA_WAYPOINTS: Record<CameraWaypointId, { camera: [number, number, number]; target: [number, number, number] }> = {
  center: { camera: [0, 8, 10], target: [0, 0.8, 0] },
  north: { camera: [0, 7.2, 12], target: [0, 0.8, -2.3] },
  south: { camera: [0, 7.2, -12], target: [0, 0.8, 2.3] },
  east: { camera: [12, 7.2, 0], target: [2.3, 0.8, 0] },
  west: { camera: [-12, 7.2, 0], target: [-2.3, 0.8, 0] },
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function blendColor(base: string, overlay: string, ratio: number) {
  const mixed = new THREE.Color(base).lerp(new THREE.Color(overlay), ratio);
  return `#${mixed.getHexString()}`;
}

function seededValue(seed: number, salt: number, min: number, max: number) {
  const raw = Math.sin(seed * 0.00113 + salt * 97.31) * 10000;
  const fraction = raw - Math.floor(raw);
  return min + fraction * (max - min);
}

function seededChoice<T>(seed: number, salt: number, values: T[]): T {
  const index = Math.floor(seededValue(seed, salt, 0, values.length));
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function createRoomLayout(seed: number): RoomLayout {
  const pattern = seededChoice<FloorPattern>(seed, 1, ['radial', 'cross', 'aisle']);
  const ringInner = seededValue(seed, 2, 2.35, 3.05);
  return {
    pattern,
    ringInner,
    ringOuter: Math.max(ringInner + 0.32, seededValue(seed, 3, 3.0, 3.8)),
    sideWallOpacity: seededValue(seed, 4, 0.35, 0.68),
    aisleHalfWidth: seededValue(seed, 5, 0.95, 1.48),
    archWidth: seededValue(seed, 6, 2.7, 4.1),
    archHeight: seededValue(seed, 7, 2.1, 3.0),
    pillarScale: seededValue(seed, 8, 0.9, 1.18),
    decorOffset: seededValue(seed, 9, -0.65, 0.65),
    ceilingOpacity: seededValue(seed, 10, 0.3, 0.52),
  };
}

function createLandmarkHints(baseHints: string[], seed: number) {
  const zoneTokens = ['북서', '북동', '중앙', '남서', '남동'];
  const start = Math.floor(seededValue(seed, 11, 0, zoneTokens.length));
  return baseHints.map((hint, index) => `${zoneTokens[(start + index * 2) % zoneTokens.length]} · ${hint}`);
}

function applyBiomeToTheme(theme: RoomTheme, biomePack: BiomePack): RoomTheme {
  const netherMode = biomePack.id === 'nether';
  return {
    ...theme,
    floorColor: blendColor(theme.floorColor, biomePack.tint, netherMode ? 0.4 : 0.2),
    wallColor: blendColor(theme.wallColor, biomePack.tint, netherMode ? 0.35 : 0.16),
    fogColor: blendColor(theme.fogColor, biomePack.fogLift, netherMode ? 0.55 : 0.38),
    wallGlow: blendColor(theme.wallGlow, biomePack.tint, netherMode ? 0.4 : 0.24),
    pointLights: theme.pointLights.map((light) => ({
      ...light,
      color: blendColor(light.color, biomePack.tint, netherMode ? 0.4 : 0.22),
    })),
  };
}

function toWorldPosition(position: { x: number; y: number }) {
  return {
    x: (position.x - 50) / 10,
    z: (position.y - 50) / 10,
  };
}

function isRoomV2(room: RoomInput): room is PalaceRoomV2 {
  return Array.isArray((room as PalaceRoomV2).anchors);
}

function normalizeRoomInput(roomInput: RoomInput): Room {
  if (!isRoomV2(roomInput)) {
    return roomInput;
  }

  return {
    id: roomInput.id,
    name: roomInput.name,
    description: roomInput.description || '',
    color: roomInput.themeColor || '#3b82f6',
    items: (roomInput.anchors || []).map((anchor) => ({
      id: anchor.id,
      content: anchor.content,
      position: {
        x: anchor.position?.x ?? 50,
        y: anchor.position?.y ?? 50,
      },
      image: anchor.image,
      shape: anchor.style?.shape || 'card',
      size: anchor.style?.size || 'medium',
      color: anchor.style?.color || roomInput.themeColor || '#3b82f6',
      height: anchor.style?.height,
    })),
  };
}

function itemCollisionRadius(item: MemoryItem) {
  const sizeMap: Record<'small' | 'medium' | 'large', number> = {
    small: 0.16,
    medium: 0.24,
    large: 0.3,
  };
  const base = sizeMap[item.size || 'medium'];
  return base + 0.12;
}

function shuffleInPlace<T>(items: T[]) {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function snapToVoxelGrid(value: number) {
  const snapped = 5 + Math.round((value - 5) / 10) * 10;
  return Math.max(5, Math.min(95, snapped));
}

function clampWorldCoordinate(value: number) {
  return Math.max(-4.8, Math.min(4.8, value));
}

function createLayoutObstacles(theme: RoomTheme): LayoutObstacle[] {
  const obstacles: LayoutObstacle[] = [];
  const offset = theme.layout.decorOffset;
  const pushObstacle = (id: string, x: number, z: number, radius: number, height: number) => {
    obstacles.push({
      id,
      x: clampWorldCoordinate(x),
      z: clampWorldCoordinate(z),
      radius,
      height,
    });
  };

  if (theme.layout.pattern === 'cross') {
    [
      [-3.1, -3.1],
      [3.1, -3.1],
      [-3.1, 3.1],
      [3.1, 3.1],
    ].forEach(([x, z], idx) => {
      pushObstacle(`cross-bastion-${idx}`, x + offset * 0.08, z - offset * 0.08, 0.94, 1.15);
    });
    pushObstacle('cross-core-north', 0 + offset * 0.12, -1.05, 0.62, 1.2);
    pushObstacle('cross-core-south', 0 - offset * 0.12, 1.1, 0.62, 1.2);
  } else if (theme.layout.pattern === 'aisle') {
    const zSlots = [-3.8, -2.35, -0.9, 0.55, 2.0, 3.45];
    zSlots.forEach((z, idx) => {
      pushObstacle(`aisle-left-${idx}`, -2.4 + offset * 0.12, z, 0.48, 1.12);
      pushObstacle(`aisle-right-${idx}`, 2.4 - offset * 0.12, z, 0.48, 1.12);
    });
    pushObstacle('aisle-far-shrine', 0, -4.25, 0.72, 1.35);
  } else {
    const ringRadius = 2.65;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + offset * 0.12;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      pushObstacle(`radial-node-${i}`, x, z, 0.43, 0.95);
    }
    pushObstacle('radial-core', 0, 0, 0.74, 1.25);
  }

  if (theme.id === 'forge') {
    pushObstacle('forge-anvil', 0.1, -1.3 + offset * 0.12, 0.84, 1.05);
  }
  if (theme.id === 'sanctum') {
    pushObstacle('sanctum-guardian-west', -1.75, -2.3, 0.5, 1.25);
    pushObstacle('sanctum-guardian-east', 1.75, -2.3, 0.5, 1.25);
  }
  if (theme.id === 'cavern') {
    pushObstacle('cavern-crystal-nw', -2.85 + offset * 0.2, -2.15, 0.55, 1.28);
    pushObstacle('cavern-crystal-ne', 2.85 - offset * 0.2, -2.15, 0.55, 1.28);
  }

  return obstacles;
}

function createExplorerSpawn(layout: RoomLayout): ExplorerPosition {
  if (layout.pattern === 'aisle') {
    return { x: 0, z: 4.45 };
  }
  if (layout.pattern === 'cross') {
    return { x: 0, z: 4.25 };
  }
  return { x: 0, z: 4.2 };
}

function describeDirectionLabel(from: ExplorerPosition, to: ExplorerPosition) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 0.45) return '도달';
  if (Math.abs(dx) > Math.abs(dz)) {
    return dx > 0 ? '동쪽' : '서쪽';
  }
  return dz > 0 ? '남쪽' : '북쪽';
}

function VoxelRoomBlocks({ theme }: { theme: RoomTheme }) {
  const floorColorA = blendColor(theme.floorColor, '#ffffff', 0.06);
  const floorColorB = blendColor(theme.floorColor, '#0f172a', 0.07);
  const wallColorA = blendColor(theme.wallColor, '#ffffff', 0.02);
  const wallColorB = blendColor(theme.wallColor, '#0f172a', 0.12);
  const glowColor = blendColor(theme.accent, '#ffffff', 0.18);
  const blockCount = 12;

  const floorTiles = [];
  for (let gx = 0; gx < blockCount; gx += 1) {
    for (let gz = 0; gz < blockCount; gz += 1) {
      const x = -5.5 + gx;
      const z = -5.5 + gz;
      const checker = (gx + gz) % 2 === 0;
      floorTiles.push(
        <mesh key={`floor-${gx}-${gz}`} position={[x, -0.06, z]} receiveShadow>
          <boxGeometry args={[1, 0.12, 1]} />
          <meshStandardMaterial
            color={checker ? floorColorA : floorColorB}
            roughness={0.9}
            metalness={0.03}
            flatShading
          />
        </mesh>
      );
    }
  }

  const wallBlocks = [];
  for (let y = 0; y < 6; y += 1) {
    for (let i = 0; i < blockCount; i += 1) {
      const offset = -5.5 + i;
      const color = (i + y) % 2 === 0 ? wallColorA : wallColorB;

      wallBlocks.push(
        <mesh key={`wall-west-${y}-${i}`} position={[-6.0, y + 0.45, offset]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial color={color} roughness={0.82} metalness={0.05} flatShading />
        </mesh>
      );

      wallBlocks.push(
        <mesh key={`wall-east-${y}-${i}`} position={[6.0, y + 0.45, offset]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial color={color} roughness={0.82} metalness={0.05} flatShading />
        </mesh>
      );

      if (y > 0) {
        wallBlocks.push(
          <mesh key={`wall-north-${y}-${i}`} position={[offset, y + 0.45, -6.0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.9, 0.9]} />
            <meshStandardMaterial color={color} roughness={0.82} metalness={0.05} flatShading />
          </mesh>
        );
      }
    }
  }

  return (
    <group>
      {floorTiles}
      {wallBlocks}

      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[theme.layout.ringInner + 0.1, theme.layout.ringOuter + 0.15, 24]} />
        <meshStandardMaterial color={glowColor} emissive={theme.accent} emissiveIntensity={0.22} flatShading />
      </mesh>
    </group>
  );
}

function ThemeDecorVoxel({ theme }: { theme: RoomTheme }) {
  const shift = theme.layout.decorOffset;
  const crystalColor = blendColor(theme.accent, '#a78bfa', 0.45);
  const woodColor = blendColor(theme.accent, '#7c5a3b', 0.6);

  if (theme.id === 'library') {
    return (
      <group>
        {[-3.5 + shift, 0, 3.5 - shift].map((x, idx) => (
          <group key={`voxel-shelf-${idx}`} position={[x, 1.2, -5.15]}>
            <mesh castShadow>
              <boxGeometry args={[1.9, 2.4, 0.8]} />
              <meshStandardMaterial color={woodColor} roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0, 0.75, 0.45]}>
              <boxGeometry args={[1.6, 0.2, 0.12]} />
              <meshStandardMaterial color={blendColor(theme.accent, '#93c5fd', 0.35)} emissive={theme.wallGlow} emissiveIntensity={0.2} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (theme.id === 'alchemist') {
    return (
      <group>
        <mesh position={[shift * 0.4, 0.45, -1.3]} castShadow>
          <boxGeometry args={[1.6, 0.9, 1.6]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#334155', 0.6)} roughness={0.78} flatShading />
        </mesh>
        <mesh position={[shift * 0.4, 1.05, -1.3]}>
          <boxGeometry args={[1.1, 0.35, 1.1]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#22d3ee', 0.5)} emissive="#22d3ee" emissiveIntensity={0.34} flatShading />
        </mesh>
      </group>
    );
  }

  if (theme.id === 'garden') {
    return (
      <group>
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[1.5, 0.65, 1.5]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#84cc16', 0.46)} roughness={0.86} flatShading />
        </mesh>
        {[-3.2, -1.2, 1.2, 3.2].map((x, idx) => (
          <group key={`voxel-tree-${idx}`} position={[x + shift * 0.2, 0, 4.2]}>
            <mesh castShadow>
              <boxGeometry args={[0.35, 0.8, 0.35]} />
              <meshStandardMaterial color="#8b5a3c" roughness={0.84} flatShading />
            </mesh>
            <mesh position={[0, 0.68, 0]} castShadow>
              <boxGeometry args={[0.9, 0.85, 0.9]} />
              <meshStandardMaterial color="#22c55e" roughness={0.8} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (theme.id === 'sanctum') {
    return (
      <group>
        <mesh position={[0, 0.55, -0.8]} castShadow>
          <boxGeometry args={[2.5, 1.1, 1.8]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#f59e0b', 0.5)} roughness={0.72} flatShading />
        </mesh>
      </group>
    );
  }

  if (theme.id === 'forge') {
    return (
      <group>
        <mesh position={[0, 0.32, -1.35]} castShadow>
          <boxGeometry args={[2.5, 0.64, 1.3]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#334155', 0.7)} roughness={0.62} flatShading />
        </mesh>
        <mesh position={[0, 0.54, -1.35]}>
          <boxGeometry args={[1.2, 0.12, 0.45]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.52} flatShading />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {[-2.7 + shift, 0, 2.7 - shift].map((x, idx) => (
        <group key={`voxel-crystal-${idx}`} position={[x, 0.45, -2.2 + idx * 0.9]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 1.2, 0.55]} />
            <meshStandardMaterial color={crystalColor} emissive={crystalColor} emissiveIntensity={0.24} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function pickRoomThemeId(room: Room): RoomThemeId {
  const text = `${room.name} ${room.description}`.toLowerCase();

  if (/(서재|도서|library|book|archive)/.test(text)) return 'library';
  if (/(실험|연금|lab|alchemy|potion)/.test(text)) return 'alchemist';
  if (/(정원|숲|garden|forest|flower)/.test(text)) return 'garden';
  if (/(성소|사원|성당|temple|sanctum|altar)/.test(text)) return 'sanctum';
  if (/(대장간|forge|fire|용광)/.test(text)) return 'forge';
  if (/(동굴|cave|crystal|mine|암굴)/.test(text)) return 'cavern';

  const fallbackThemes: RoomThemeId[] = ['library', 'alchemist', 'garden', 'sanctum', 'forge', 'cavern'];
  return fallbackThemes[hashString(room.id || room.name) % fallbackThemes.length];
}

function createRoomTheme(room: Room): RoomTheme {
  const id = pickRoomThemeId(room);
  const spec = THEME_SPECS[id];
  const seed = hashString(`${room.id}|${room.name}|${room.description}|${room.color}`);
  const accent = blendColor(room.color || '#3b82f6', '#ffffff', 0.1);

  return {
    ...spec,
    accent,
    floorColor: blendColor(room.color || '#3b82f6', '#ffffff', 0.78),
    wallColor: blendColor(room.color || '#3b82f6', '#ffffff', 0.88),
    landmarkHints: createLandmarkHints(spec.landmarkHints, seed),
    seed,
    layout: createRoomLayout(seed),
  };
}

function CornerPillars({ color, scale = 1 }: { color: string; scale?: number }) {
  const pillarPositions: Array<[number, number, number]> = [
    [-5.2, 1.4, -5.2],
    [5.2, 1.4, -5.2],
    [-5.2, 1.4, 5.2],
    [5.2, 1.4, 5.2],
  ];

  return (
    <group>
      {pillarPositions.map((position, index) => (
        <group key={`pillar-${index}`} position={position} scale={[scale, scale, scale]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.24, 0.3, 2.8, 12]} />
            <meshStandardMaterial color={color} metalness={0.25} roughness={0.68} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <boxGeometry args={[0.55, 0.25, 0.55]} />
            <meshStandardMaterial color={blendColor(color, '#ffffff', 0.22)} metalness={0.2} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ThemeDecor({ theme }: { theme: RoomTheme }) {
  const shift = theme.layout.decorOffset;
  const minorShift = shift * 0.35;

  if (theme.id === 'library') {
    const shelfXs = [-3.6 + shift, 0, 3.6 - shift];
    return (
      <group>
        {shelfXs.map((x) => (
          <group key={`shelf-${x}`} position={[x, 1.2, -5.35]}>
            <mesh castShadow>
              <boxGeometry args={[1.8, 2.4, 0.3]} />
              <meshStandardMaterial color={blendColor(theme.accent, '#6b4f3b', 0.65)} roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.5, 0.2]}>
              <boxGeometry args={[1.4, 0.08, 0.12]} />
              <meshStandardMaterial color={blendColor(theme.accent, '#93c5fd', 0.45)} emissive={theme.wallGlow} emissiveIntensity={0.18} />
            </mesh>
          </group>
        ))}
        <mesh position={[shift * 0.6, 0.45, -1.05 + minorShift]} castShadow>
          <boxGeometry args={[2.3 + Math.abs(minorShift) * 0.4, 0.35, 1.4]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#5b3d30', 0.58)} roughness={0.68} />
        </mesh>
        <mesh position={[minorShift, 2.65 + seededValue(theme.seed, 20, 0, 0.35), 0]}>
          <sphereGeometry args={[0.3, 20, 20]} />
          <meshStandardMaterial color="#fff7cc" emissive="#fff1a8" emissiveIntensity={0.45} />
        </mesh>
      </group>
    );
  }

  if (theme.id === 'alchemist') {
    const potionXs = [-2.45 + shift, 0.1, 2.45 - shift];
    return (
      <group>
        <mesh position={[minorShift, 0.35, -1.4 + minorShift]} castShadow>
          <cylinderGeometry args={[0.8, 0.95, 0.7, 20]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#374151', 0.72)} metalness={0.35} roughness={0.6} />
        </mesh>
        <mesh position={[minorShift, 0.62, -1.4 + minorShift]}>
          <sphereGeometry args={[0.42, 20, 20]} />
          <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.35} transparent opacity={0.85} />
        </mesh>
        {potionXs.map((x) => (
          <group key={`potion-${x}`} position={[x, 1.4, -4.9]}>
            <mesh>
              <boxGeometry args={[1.1, 0.12, 0.35]} />
              <meshStandardMaterial color={blendColor(theme.accent, '#475569', 0.68)} />
            </mesh>
            <mesh position={[-0.25, 0.22, 0]}>
              <sphereGeometry args={[0.11, 14, 14]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.45} />
            </mesh>
            <mesh position={[0.02, 0.22, 0]}>
              <sphereGeometry args={[0.11, 14, 14]} />
              <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.45} />
            </mesh>
            <mesh position={[0.29, 0.22, 0]}>
              <sphereGeometry args={[0.11, 14, 14]} />
              <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.45} />
            </mesh>
          </group>
        ))}
        <mesh position={[minorShift, 0.02, 2.1 - shift * 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.5, 48]} />
          <meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={0.35} transparent opacity={0.8} />
        </mesh>
      </group>
    );
  }

  if (theme.id === 'garden') {
    return (
      <group>
        <mesh position={[minorShift, 0.23, 0]} castShadow>
          <cylinderGeometry args={[0.9, 1.05, 0.45, 24]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#cbd5e1', 0.6)} roughness={0.82} />
        </mesh>
        <mesh position={[minorShift, 0.48, 0]}>
          <sphereGeometry args={[0.42, 20, 20]} />
          <meshStandardMaterial color="#a7f3d0" emissive="#86efac" emissiveIntensity={0.3} transparent opacity={0.82} />
        </mesh>
        <group position={[-4.2 + shift, 0.2, -2.5]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.22, 2.2, 10]} />
            <meshStandardMaterial color={blendColor(theme.accent, '#8b5e3c', 0.64)} />
          </mesh>
          <mesh position={[0.95, 0, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 2.2, 10]} />
            <meshStandardMaterial color={blendColor(theme.accent, '#8b5e3c', 0.64)} />
          </mesh>
          <mesh position={[0.47, 1.1, 0]} castShadow>
            <boxGeometry args={[1.25, 0.22, 0.25]} />
            <meshStandardMaterial color={blendColor(theme.accent, '#8b5e3c', 0.58)} />
          </mesh>
        </group>
        {[-3.2 + shift * 0.3, -1.2 + shift * 0.15, 1.2 - shift * 0.12, 3.2 - shift * 0.28].map((x, idx) => (
          <group key={`tree-${idx}`} position={[x, 0, 4.2 - minorShift]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.12, 0.16, 0.8, 8]} />
              <meshStandardMaterial color="#8b5a3c" />
            </mesh>
            <mesh position={[0, 0.72, 0]} castShadow>
              <coneGeometry args={[0.5, 0.9, 10]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (theme.id === 'sanctum') {
    const guardianSpread = 2.0 + seededValue(theme.seed, 21, 0.1, 0.45);
    return (
      <group>
        <mesh position={[minorShift, 0.45, -0.8 + shift * 0.2]} castShadow>
          <boxGeometry args={[2.4, 0.9, 1.6]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#d4a94f', 0.52)} metalness={0.35} roughness={0.45} />
        </mesh>
        {[-guardianSpread, guardianSpread].map((x) => (
          <group key={`guardian-${x}`} position={[x, 0.45, -2.3]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.25, 0.3, 0.9, 10]} />
              <meshStandardMaterial color={blendColor(theme.accent, '#b08947', 0.58)} />
            </mesh>
            <mesh position={[0, 0.65, 0]} castShadow>
              <coneGeometry args={[0.3, 0.8, 8]} />
              <meshStandardMaterial color={blendColor(theme.accent, '#f59e0b', 0.48)} />
            </mesh>
          </group>
        ))}
        <mesh position={[minorShift, 0.02, 2.45 - shift * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.5, 56]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.28} />
        </mesh>
      </group>
    );
  }

  if (theme.id === 'forge') {
    return (
      <group>
        <mesh position={[minorShift, 0.28, -1.4 + shift * 0.18]} castShadow>
          <boxGeometry args={[2.4, 0.56, 1.3]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#334155', 0.72)} metalness={0.5} roughness={0.45} />
        </mesh>
        <mesh position={[minorShift, 0.14, -1.4 + shift * 0.18]}>
          <boxGeometry args={[1.6, 0.05, 0.55]} />
          <meshStandardMaterial color="#fb7185" emissive="#f97316" emissiveIntensity={0.55} />
        </mesh>
        <mesh position={[-3.4 + shift, 0.55, -2.2]} castShadow>
          <boxGeometry args={[1.1, 0.55, 0.75]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#475569', 0.66)} metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[3.8, 1.4, -4.95]} castShadow>
          <boxGeometry args={[0.12, 2.1, 0.12]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[3.35, 1.4, -4.95]} castShadow>
          <boxGeometry args={[0.12, 2.1, 0.12]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[3.58, 2.1, -4.9]} castShadow>
          <boxGeometry args={[0.7, 0.08, 0.2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {[-2.8 + shift * 0.4, 0, 2.8 - shift * 0.4].map((x, idx) => (
        <group key={`crystal-${idx}`} position={[x, 0.45, -2.4 + (idx % 2) * (1.0 + Math.abs(minorShift))]}>
          <mesh castShadow>
            <coneGeometry args={[0.45, 1.3, 6]} />
            <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.38} transparent opacity={0.88} />
          </mesh>
          <mesh position={[0.2, -0.25, 0.2]} castShadow>
            <sphereGeometry args={[0.25, 14, 14]} />
            <meshStandardMaterial color={blendColor(theme.accent, '#64748b', 0.62)} roughness={0.88} />
          </mesh>
        </group>
      ))}
      {[-4.2 + shift * 0.2, -1.4 + shift * 0.1, 1.4 - shift * 0.1, 4.2 - shift * 0.2].map((x, idx) => (
        <mesh key={`stalag-${idx}`} position={[x, 0.35, 4.5 - minorShift]} castShadow>
          <coneGeometry args={[0.3, 0.7, 6]} />
          <meshStandardMaterial color={blendColor(theme.accent, '#475569', 0.68)} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function LayoutObstacleMeshes({ obstacles, theme, stylePack }: {
  obstacles: LayoutObstacle[];
  theme: RoomTheme;
  stylePack: WorldStylePack;
}) {
  const bodyColor = blendColor(theme.accent, '#334155', stylePack.id === 'voxel' ? 0.52 : 0.66);
  const edgeColor = blendColor(theme.accent, '#f8fafc', 0.2);

  return (
    <group>
      {obstacles.map((obstacle, index) => {
        const width = obstacle.radius * (stylePack.id === 'voxel' ? 2.15 : 2.0);
        const height = obstacle.height;
        const isVoxel = stylePack.id === 'voxel';
        const emissiveIntensity = isVoxel ? 0.1 : 0.06;
        return (
          <group key={obstacle.id} position={[obstacle.x, 0, obstacle.z]}>
            {isVoxel ? (
              <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height, width]} />
                <meshStandardMaterial
                  color={bodyColor}
                  emissive={edgeColor}
                  emissiveIntensity={emissiveIntensity}
                  flatShading
                />
              </mesh>
            ) : (
              <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[obstacle.radius, obstacle.radius * 1.06, height, 14]} />
                <meshStandardMaterial color={bodyColor} metalness={0.28} roughness={0.58} flatShading={stylePack.flatShading} />
              </mesh>
            )}
            <mesh position={[0, Math.max(0.06, height + 0.05), 0]} castShadow>
              <boxGeometry args={[width * 0.56, 0.08, width * 0.56]} />
              <meshStandardMaterial
                color={edgeColor}
                emissive={theme.accent}
                emissiveIntensity={0.16 + (index % 3) * 0.04}
                flatShading={stylePack.flatShading}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function RoomEnvironment({ theme, stylePack }: { theme: RoomTheme; stylePack: WorldStylePack }) {
  const gridDivisions = theme.layout.pattern === 'aisle' ? 14 : theme.layout.pattern === 'cross' ? 10 : 12;
  const laneColor = blendColor(theme.accent, '#ffffff', 0.2);
  const wallTrim = blendColor(theme.accent, '#475569', 0.5);
  const overlayOpacity = stylePack.id === 'voxel' ? 0.9 : 0.8;
  const layoutObstacles = createLayoutObstacles(theme);

  return (
    <group>
      {stylePack.id === 'voxel' ? (
        <VoxelRoomBlocks theme={theme} />
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color={theme.floorColor} flatShading={stylePack.flatShading} />
        </mesh>
      )}

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[theme.layout.ringInner, theme.layout.ringOuter, 64]} />
        <meshStandardMaterial
          color={theme.accent}
          emissive={theme.accent}
          emissiveIntensity={stylePack.id === 'voxel' ? 0.14 : 0.2}
          transparent
          opacity={overlayOpacity}
          flatShading={stylePack.flatShading}
        />
      </mesh>

      {theme.layout.pattern === 'cross' && (
        <>
          <mesh position={[0, 0.016, 0]} receiveShadow>
            <boxGeometry args={[1.35, 0.03, 10.2]} />
            <meshStandardMaterial color={laneColor} transparent opacity={0.45} flatShading={stylePack.flatShading} />
          </mesh>
          <mesh position={[0, 0.016, 0]} receiveShadow>
            <boxGeometry args={[10.2, 0.03, 1.35]} />
            <meshStandardMaterial color={laneColor} transparent opacity={0.45} flatShading={stylePack.flatShading} />
          </mesh>
        </>
      )}
      {theme.layout.pattern === 'aisle' && (
        <mesh position={[0, 0.016, 0.2]} receiveShadow>
          <boxGeometry args={[theme.layout.aisleHalfWidth * 2, 0.03, 10.4]} />
          <meshStandardMaterial color={laneColor} transparent opacity={0.52} flatShading={stylePack.flatShading} />
        </mesh>
      )}
      {theme.layout.pattern === 'radial' && (
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[theme.layout.ringInner - 0.95, theme.layout.ringInner - 0.65, 64]} />
          <meshStandardMaterial color={laneColor} transparent opacity={0.46} flatShading={stylePack.flatShading} />
        </mesh>
      )}

      {stylePack.id !== 'voxel' && (
        <gridHelper
          args={[12, gridDivisions, blendColor(theme.accent, '#64748b', 0.45), blendColor(theme.accent, '#cbd5e1', 0.62)]}
          position={[0, 0.015, 0]}
        />
      )}

      <mesh position={[0, 3, -6]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color={theme.wallColor} side={THREE.DoubleSide} flatShading={stylePack.flatShading} />
      </mesh>
      <mesh position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial
          color={theme.wallColor}
          side={THREE.DoubleSide}
          transparent
          opacity={stylePack.id === 'voxel' ? 0.32 : theme.layout.sideWallOpacity}
          flatShading={stylePack.flatShading}
        />
      </mesh>
      <mesh position={[6, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial
          color={theme.wallColor}
          side={THREE.DoubleSide}
          transparent
          opacity={stylePack.id === 'voxel' ? 0.32 : theme.layout.sideWallOpacity}
          flatShading={stylePack.flatShading}
        />
      </mesh>

      <mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial
          color={blendColor(theme.wallColor, '#ffffff', 0.08)}
          side={THREE.DoubleSide}
          transparent
          opacity={theme.layout.ceilingOpacity}
          flatShading={stylePack.flatShading}
        />
      </mesh>

      <group position={[0, theme.layout.archHeight / 2 - 0.1, -5.94]}>
        <mesh position={[-theme.layout.archWidth / 2, 0, 0]} castShadow>
          <boxGeometry args={[0.3, theme.layout.archHeight, 0.3]} />
          <meshStandardMaterial color={wallTrim} metalness={0.35} roughness={0.6} flatShading={stylePack.flatShading} />
        </mesh>
        <mesh position={[theme.layout.archWidth / 2, 0, 0]} castShadow>
          <boxGeometry args={[0.3, theme.layout.archHeight, 0.3]} />
          <meshStandardMaterial color={wallTrim} metalness={0.35} roughness={0.6} flatShading={stylePack.flatShading} />
        </mesh>
        <mesh position={[0, theme.layout.archHeight / 2, 0]} castShadow>
          <boxGeometry args={[theme.layout.archWidth + 0.32, 0.24, 0.3]} />
          <meshStandardMaterial
            color={blendColor(wallTrim, '#f8fafc', 0.22)}
            metalness={0.35}
            roughness={0.55}
            flatShading={stylePack.flatShading}
          />
        </mesh>
      </group>

      {[-1, 1].map((sign) => (
        <mesh
          key={`banner-${sign}`}
          position={[sign * (theme.layout.archWidth / 2 + 0.82), 2.52 + sign * 0.12, -5.72]}
          rotation={[0, 0, sign * 0.06]}
        >
          <planeGeometry args={[0.72, 1.75]} />
          <meshStandardMaterial
            color={blendColor(theme.accent, '#0f172a', 0.28)}
            emissive={theme.accent}
            emissiveIntensity={stylePack.id === 'voxel' ? 0.06 : 0.12}
            flatShading={stylePack.flatShading}
          />
        </mesh>
      ))}

      <CornerPillars color={blendColor(theme.accent, '#94a3b8', 0.45)} scale={theme.layout.pillarScale} />
      <LayoutObstacleMeshes obstacles={layoutObstacles} theme={theme} stylePack={stylePack} />
      {stylePack.id === 'voxel' ? <ThemeDecorVoxel theme={theme} /> : <ThemeDecor theme={theme} />}
    </group>
  );
}

// Draggable 3D Object
function DraggableObject({ item, isSelected, onSelect, onDoubleClick, onDragEnd, setDragging, stylePack, dragEnabled }: {
  item: MemoryItem;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onDragEnd: (data: { position?: { x: number; y: number }; height?: number }) => void;
  setDragging: (v: boolean) => void;
  stylePack: WorldStylePack;
  dragEnabled?: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [localDragging, setLocalDragging] = useState(false);
  const [heightMode, setHeightMode] = useState(false);
  const dragStart = useRef<{ x: number; z: number; y: number; mouseY: number } | null>(null);
  const { camera, raycaster, pointer } = useThree();

  const x = (item.position.x - 50) / 10;
  const z = (item.position.y - 50) / 10;
  const baseY = item.height ?? 0.5;
  const sizeMap = { small: 0.4, medium: 0.6, large: 0.9 };
  const scale = sizeMap[item.size || 'medium'];
  const color = item.color || '#3b82f6';

  const getFloorIntersection = (): THREE.Vector3 | null => {
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    return target;
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isSelected) {
      onSelect();
      return;
    }
    if (dragEnabled === false) {
      return;
    }
    e.stopPropagation();
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    setLocalDragging(true);
    setDragging(true);
    const isHeightMode = e.shiftKey;
    setHeightMode(isHeightMode);

    const intersection = getFloorIntersection();
    if (intersection && meshRef.current) {
      dragStart.current = {
        x: intersection.x - meshRef.current.position.x,
        z: intersection.z - meshRef.current.position.z,
        y: meshRef.current.position.y,
        mouseY: e.clientY,
      };
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!localDragging || !meshRef.current || !dragStart.current) return;
    e.stopPropagation();

    if (heightMode) {
      const deltaY = (dragStart.current.mouseY - e.clientY) / 50;
      const newY = Math.max(0.5, Math.min(4, dragStart.current.y + deltaY));
      meshRef.current.position.y = newY;
    } else {
      const intersection = getFloorIntersection();
      if (intersection) {
        meshRef.current.position.x = Math.max(-5, Math.min(5, intersection.x - dragStart.current.x));
        meshRef.current.position.z = Math.max(-5, Math.min(5, intersection.z - dragStart.current.z));
      }
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!localDragging || !meshRef.current) return;
    e.stopPropagation();
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    setLocalDragging(false);
    setDragging(false);

    if (heightMode) {
      onDragEnd({ height: meshRef.current.position.y });
    } else {
      const rawX = Math.max(5, Math.min(95, (meshRef.current.position.x * 10) + 50));
      const rawY = Math.max(5, Math.min(95, (meshRef.current.position.z * 10) + 50));
      const newX = stylePack.blockSnap ? snapToVoxelGrid(rawX) : rawX;
      const newY = stylePack.blockSnap ? snapToVoxelGrid(rawY) : rawY;
      onDragEnd({ position: { x: newX, y: newY } });
    }
    dragStart.current = null;
    setHeightMode(false);
  };

  const material = (
    <meshStandardMaterial
      color={localDragging ? '#22c55e' : color}
      emissive={isSelected ? color : '#000000'}
      emissiveIntensity={isSelected ? 0.4 : 0}
      metalness={0.2}
      roughness={0.6}
      flatShading={stylePack.flatShading}
    />
  );

  const shapeProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerOver: () => setHovered(true),
    onPointerOut: () => setHovered(false),
    onDoubleClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onDoubleClick(); },
    castShadow: true,
  };

  const renderShape = () => {
    if (stylePack.id === 'voxel') {
      return <Box args={[0.85, 0.85, 0.85]} {...shapeProps}>{material}</Box>;
    }

    switch (item.shape) {
      case 'sphere':
        return <Sphere args={[0.5, 32, 32]} {...shapeProps}>{material}</Sphere>;
      case 'cylinder':
        return <Cylinder args={[0.35, 0.35, 1, 32]} {...shapeProps}>{material}</Cylinder>;
      case 'pyramid':
        return <Cone args={[0.5, 1, 4]} {...shapeProps}>{material}</Cone>;
      default:
        return <Box args={[0.8, 0.8, 0.8]} {...shapeProps}>{material}</Box>;
    }
  };

  return (
    <group ref={meshRef} position={[x, baseY, z]} scale={hovered && !localDragging ? scale * 1.1 : scale}>
      {renderShape()}
      {item.image && (
        <Html position={[0, 1, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="text-3xl select-none">{item.image}</div>
        </Html>
      )}
      <Html position={[0, -1.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={`px-2 py-1 rounded text-xs max-w-[100px] text-center truncate ${
          isSelected ? 'bg-blue-500 text-white font-bold' : 'bg-white/90 text-gray-800'
        }`}>
          {item.content}
        </div>
      </Html>
      {isSelected && (
        <mesh position={[0, -baseY + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.75, 32]} />
          <meshBasicMaterial color={localDragging ? (heightMode ? '#8b5cf6' : '#22c55e') : '#f59e0b'} />
        </mesh>
      )}
      {isSelected && baseY > 0.6 && (
        <mesh position={[0, -baseY / 2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, baseY - 0.5, 8]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

function FootstepDecal({ x, z, color, onDone }: {
  x: number;
  z: number;
  color: string;
  onDone: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);

  useFrame((_, delta) => {
    if (!meshRef.current || finishedRef.current) return;
    elapsedRef.current += delta;
    const life = elapsedRef.current / 0.55;

    const scale = 0.3 + life * 0.65;
    meshRef.current.scale.set(scale, scale, scale);

    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 0.5 * (1 - life));

    if (life >= 1) {
      finishedRef.current = true;
      onDone();
    }
  });

  return (
    <mesh ref={meshRef} position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.28, 0.45, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

function ExplorerAvatar({ enabled, accent, obstacles, spawnPoint, onPositionChange }: {
  enabled: boolean;
  accent: string;
  obstacles: ExplorerObstacle[];
  spawnPoint: ExplorerPosition;
  onPositionChange: (position: ExplorerPosition) => void;
}) {
  const avatarRef = useRef<THREE.Group>(null);
  const keyState = useRef<Record<string, boolean>>({});
  const jumpRequested = useRef(false);
  const velocityY = useRef(0);
  const stepCooldown = useRef(0);
  const stepId = useRef(0);
  const lastReported = useRef<ExplorerPosition>({ x: spawnPoint.x, z: spawnPoint.z });
  const [footsteps, setFootsteps] = useState<FootstepEntry[]>([]);

  const groundY = 0.52;
  const playerRadius = 0.34;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keyState.current[key] = true;
        event.preventDefault();
      }
      if (key === ' ') {
        jumpRequested.current = true;
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keyState.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);

  useEffect(() => {
    if (enabled || !avatarRef.current) return;
    avatarRef.current.position.set(spawnPoint.x, groundY, spawnPoint.z);
    avatarRef.current.rotation.y = 0;
    velocityY.current = 0;
    stepCooldown.current = 0;
    jumpRequested.current = false;
    keyState.current = {};
    setFootsteps([]);
    const resetPos = { x: spawnPoint.x, z: spawnPoint.z };
    lastReported.current = resetPos;
    onPositionChange(resetPos);
  }, [enabled, groundY, onPositionChange, spawnPoint.x, spawnPoint.z]);

  useEffect(() => {
    if (!avatarRef.current || enabled) return;
    avatarRef.current.position.set(spawnPoint.x, groundY, spawnPoint.z);
    lastReported.current = { x: spawnPoint.x, z: spawnPoint.z };
    onPositionChange({ x: spawnPoint.x, z: spawnPoint.z });
  }, [enabled, groundY, onPositionChange, spawnPoint.x, spawnPoint.z]);

  useFrame((_, delta) => {
    if (!enabled || !avatarRef.current) return;

    const key = keyState.current;
    let moveX = 0;
    let moveZ = 0;

    if (key.w || key.arrowup) moveZ -= 1;
    if (key.s || key.arrowdown) moveZ += 1;
    if (key.a || key.arrowleft) moveX -= 1;
    if (key.d || key.arrowright) moveX += 1;

    const length = Math.hypot(moveX, moveZ);
    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }

    const speed = 3.1;
    let nextX = avatarRef.current.position.x + moveX * speed * delta;
    let nextZ = avatarRef.current.position.z + moveZ * speed * delta;

    for (const obstacle of obstacles) {
      const dx = nextX - obstacle.x;
      const dz = nextZ - obstacle.z;
      const distance = Math.hypot(dx, dz);
      const minDistance = obstacle.radius + playerRadius;
      if (distance < minDistance) {
        const safeDistance = distance || 0.0001;
        const push = minDistance - safeDistance;
        nextX += (dx / safeDistance) * push;
        nextZ += (dz / safeDistance) * push;
      }
    }

    nextX = Math.max(-4.8, Math.min(4.8, nextX));
    nextZ = Math.max(-4.8, Math.min(4.8, nextZ));

    const grounded = avatarRef.current.position.y <= groundY + 0.01;
    if (jumpRequested.current && grounded) {
      velocityY.current = 4.4;
      jumpRequested.current = false;
    }

    velocityY.current -= 11.5 * delta;
    let nextY = avatarRef.current.position.y + velocityY.current * delta;
    if (nextY < groundY) {
      nextY = groundY;
      velocityY.current = 0;
    }

    avatarRef.current.position.set(nextX, nextY, nextZ);

    if (length > 0.05) {
      avatarRef.current.rotation.y = Math.atan2(moveX, moveZ);
    }

    const movingOnGround = length > 0.05 && nextY <= groundY + 0.015;
    if (movingOnGround) {
      stepCooldown.current -= delta;
      if (stepCooldown.current <= 0) {
        stepCooldown.current = 0.22;
        const id = stepId.current + 1;
        stepId.current = id;
        setFootsteps((prev) => [...prev.slice(-13), { id, x: nextX, z: nextZ }]);
      }
    } else {
      stepCooldown.current = Math.max(0, stepCooldown.current - delta * 0.5);
    }

    const nextPos = { x: nextX, z: nextZ };
    if (Math.abs(nextPos.x - lastReported.current.x) > 0.02 || Math.abs(nextPos.z - lastReported.current.z) > 0.02) {
      lastReported.current = nextPos;
      onPositionChange(nextPos);
    }
  });

  if (!enabled) return null;

  return (
    <group>
      {footsteps.map((step) => (
        <FootstepDecal
          key={step.id}
          x={step.x}
          z={step.z}
          color={blendColor(accent, '#22d3ee', 0.35)}
          onDone={() => setFootsteps((prev) => prev.filter((entry) => entry.id !== step.id))}
        />
      ))}

      <group ref={avatarRef} position={[spawnPoint.x, groundY, spawnPoint.z]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.58, 0.3]} />
          <meshStandardMaterial color={blendColor(accent, '#f8fafc', 0.25)} flatShading />
        </mesh>
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[0.34, 0.34, 0.28]} />
          <meshStandardMaterial color="#f8d4b4" flatShading />
        </mesh>
        <mesh position={[0, 0.66, 0.14]} castShadow>
          <boxGeometry args={[0.14, 0.08, 0.05]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.32} flatShading />
        </mesh>
        <mesh position={[0, -0.34, -0.05]} castShadow>
          <boxGeometry args={[0.38, 0.12, 0.42]} />
          <meshStandardMaterial color={blendColor(accent, '#0f172a', 0.42)} flatShading />
        </mesh>
      </group>
    </group>
  );
}

function RoomPortals3D({ enabled, accent, canPrev, canNext, onNavigate }: {
  enabled: boolean;
  accent: string;
  canPrev: boolean;
  canNext: boolean;
  onNavigate: (direction: PortalDirection) => void;
}) {
  if (!enabled) return null;

  const portalBase = blendColor(accent, '#1e293b', 0.32);
  const prevActive = canPrev;
  const nextActive = canNext;

  return (
    <group>
      <group
        position={[-4.75, 1.05, -5.25]}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (!prevActive) return;
          event.stopPropagation();
          onNavigate('prev');
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[1.15, 2.1, 0.3]} />
          <meshStandardMaterial
            color={portalBase}
            emissive="#22c55e"
            emissiveIntensity={prevActive ? 0.28 : 0.06}
            transparent
            opacity={prevActive ? 1 : 0.4}
            flatShading
          />
        </mesh>
        <mesh position={[0, -1.04, 0.18]} castShadow>
          <boxGeometry args={[1.25, 0.2, 0.7]} />
          <meshStandardMaterial
            color={blendColor(portalBase, '#94a3b8', 0.35)}
            transparent
            opacity={prevActive ? 1 : 0.45}
            flatShading
          />
        </mesh>
      </group>

      <group
        position={[4.75, 1.05, -5.25]}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (!nextActive) return;
          event.stopPropagation();
          onNavigate('next');
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[1.15, 2.1, 0.3]} />
          <meshStandardMaterial
            color={portalBase}
            emissive="#38bdf8"
            emissiveIntensity={nextActive ? 0.28 : 0.06}
            transparent
            opacity={nextActive ? 1 : 0.4}
            flatShading
          />
        </mesh>
        <mesh position={[0, -1.04, 0.18]} castShadow>
          <boxGeometry args={[1.25, 0.2, 0.7]} />
          <meshStandardMaterial
            color={blendColor(portalBase, '#94a3b8', 0.35)}
            transparent
            opacity={nextActive ? 1 : 0.45}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
}

function Scene({
  room,
  theme,
  styleMode = 'cinematic',
  roomIndex = 0,
  roomCount = 1,
  onPortalNavigate,
  selectedItem,
  onSelectItem,
  onEditItem,
  onUpdateItem,
  exploreMode,
  spawnPoint,
  cameraCommand,
  onExplorerPositionChange,
}: Omit<MemoryPalace3DProps, 'room'> & {
  room: Room;
  theme: RoomTheme;
  exploreMode: boolean;
  spawnPoint: ExplorerPosition;
  cameraCommand: SceneCameraCommand;
  onExplorerPositionChange: (position: ExplorerPosition) => void;
}) {
  const controlsRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const stylePack = WORLD_STYLE_PACKS[styleMode];
  const { camera } = useThree();
  const explorerPosRef = useRef<ExplorerPosition>(spawnPoint);
  const canPortalPrev = roomIndex > 0;
  const canPortalNext = roomIndex < roomCount - 1;
  const structureObstacles = useMemo(
    () => createLayoutObstacles(theme),
    [theme.id, theme.layout.pattern, theme.layout.decorOffset]
  );
  const explorerObstacles = useMemo(() => {
    const items = room.items.map((item) => {
      const world = toWorldPosition(item.position);
      return {
        x: world.x,
        z: world.z,
        radius: itemCollisionRadius(item),
      } satisfies ExplorerObstacle;
    });

    const structural = structureObstacles.map((obstacle) => ({
      x: obstacle.x,
      z: obstacle.z,
      radius: obstacle.radius,
    }));

    return [...structural, ...items];
  }, [room.items, structureObstacles]);

  useEffect(() => {
    explorerPosRef.current = spawnPoint;
    onExplorerPositionChange(spawnPoint);
  }, [onExplorerPositionChange, spawnPoint.x, spawnPoint.z]);

  useEffect(() => {
    if (exploreMode) return;
    const waypoint = CAMERA_WAYPOINTS[cameraCommand.id];
    const lift = stylePack.id === 'voxel' ? 0.6 : 0;
    camera.position.set(waypoint.camera[0], waypoint.camera[1] + lift, waypoint.camera[2]);
    if (controlsRef.current) {
      controlsRef.current.target.set(waypoint.target[0], waypoint.target[1], waypoint.target[2]);
      controlsRef.current.update();
    }
  }, [camera, cameraCommand, exploreMode, stylePack.id]);

  useFrame((_, delta) => {
    if (!exploreMode) return;
    const avatar = explorerPosRef.current;
    const cameraHeight = stylePack.id === 'voxel' ? 3.1 : 3.5;
    const followDistance = stylePack.id === 'voxel' ? 4.8 : 4.5;
    const desired = new THREE.Vector3(avatar.x, cameraHeight, avatar.z + followDistance);
    const lookAt = new THREE.Vector3(avatar.x, 1, avatar.z - 0.7);

    camera.position.lerp(desired, Math.min(1, delta * 5));
    camera.lookAt(lookAt);
  });

  const handleExplorerPositionChange = (position: ExplorerPosition) => {
    explorerPosRef.current = position;
    onExplorerPositionChange(position);
  };

  return (
    <>
      <color attach="background" args={[theme.fogColor]} />
      {stylePack.showFog && <fog attach="fog" args={[theme.fogColor, 12, 28]} />}

      <PerspectiveCamera makeDefault position={[0, stylePack.id === 'voxel' ? 8.4 : 8, stylePack.id === 'voxel' ? 10.8 : 10]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enabled={!isDragging && !exploreMode}
        enablePan
        enableZoom
        minDistance={4}
        maxDistance={stylePack.id === 'voxel' ? 18 : 20}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
      <ambientLight intensity={stylePack.id === 'voxel' ? theme.ambientIntensity + 0.08 : theme.ambientIntensity} color={theme.wallGlow} />
      <directionalLight position={[5, 10, 5]} intensity={stylePack.id === 'voxel' ? theme.directionalIntensity - 0.12 : theme.directionalIntensity} castShadow />
      {theme.pointLights.map((light, index) => (
        <pointLight
          key={`theme-light-${index}`}
          position={light.position}
          color={light.color}
          intensity={stylePack.id === 'voxel' ? light.intensity * 0.86 : light.intensity}
          distance={18}
        />
      ))}

      <Suspense fallback={null}>
        <RoomEnvironment theme={theme} stylePack={stylePack} />
        {room.items.map((item) => (
          <DraggableObject
            key={item.id}
            item={item}
            isSelected={selectedItem === item.id}
            onSelect={() => onSelectItem(selectedItem === item.id ? null : item.id)}
            onDoubleClick={() => onEditItem(item)}
            onDragEnd={(data) => onUpdateItem?.(item.id, data)}
            setDragging={setIsDragging}
            stylePack={stylePack}
            dragEnabled={!exploreMode}
          />
        ))}

        <RoomPortals3D
          enabled={roomCount > 1 && Boolean(onPortalNavigate)}
          canPrev={canPortalPrev}
          canNext={canPortalNext}
          accent={theme.accent}
          onNavigate={(direction) => onPortalNavigate?.(direction)}
        />

        <ExplorerAvatar
          enabled={exploreMode}
          accent={theme.accent}
          obstacles={explorerObstacles}
          spawnPoint={spawnPoint}
          onPositionChange={handleExplorerPositionChange}
        />
      </Suspense>
    </>
  );
}

export default function MemoryPalace3D({
  room: roomInput,
  selectedItem,
  onSelectItem,
  onEditItem,
  styleMode = 'voxel',
  biomeId = 'academy',
  roomIndex = 0,
  roomCount = 1,
  onPortalNavigate,
  onUpdateItem,
}: MemoryPalace3DProps) {
  const room = useMemo(() => normalizeRoomInput(roomInput), [roomInput]);
  const baseTheme = useMemo(
    () => createRoomTheme(room),
    [room.id, room.name, room.description, room.color]
  );
  const biomePack = BIOME_PACKS[biomeId];
  const theme = useMemo(
    () => applyBiomeToTheme(baseTheme, biomePack),
    [baseTheme, biomePack]
  );
  const stylePack = WORLD_STYLE_PACKS[styleMode];
  const layoutLabels: Record<FloorPattern, string> = {
    radial: '원형 순환 동선',
    cross: '십자 탐색 동선',
    aisle: '직선 복도 동선',
  };
  const fogGridSize = 12;
  const spawnPoint = useMemo(
    () => createExplorerSpawn(theme.layout),
    [theme.layout.pattern]
  );

  const [exploreMode, setExploreMode] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<SceneCameraCommand>({ id: 'center', nonce: 0 });
  const [explorerPosition, setExplorerPosition] = useState<ExplorerPosition>(spawnPoint);
  const [nearbyItemId, setNearbyItemId] = useState<string | null>(null);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionReveal, setInteractionReveal] = useState(false);
  const visitedCellsRef = useRef<Set<string>>(new Set());
  const [visitedCells, setVisitedCells] = useState<string[]>([]);
  const [questMode, setQuestMode] = useState<'path' | 'shuffle'>('path');
  const [questOrder, setQuestOrder] = useState<string[]>([]);
  const [questIndex, setQuestIndex] = useState(0);
  const [questActive, setQuestActive] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [questNotice, setQuestNotice] = useState('');
  const [hudMinimal, setHudMinimal] = useState(false);
  const [controlPanelCollapsed, setControlPanelCollapsed] = useState(false);
  const canPortalPrev = roomIndex > 0;
  const canPortalNext = roomIndex < roomCount - 1;

  useEffect(() => {
    setExploreMode(false);
    setExplorerPosition(spawnPoint);
    setNearbyItemId(null);
    setInteractionOpen(false);
    setInteractionReveal(false);
    setCameraCommand((prev) => ({ id: 'center', nonce: prev.nonce + 1 }));
    setQuestOrder([]);
    setQuestIndex(0);
    setQuestActive(false);
    setQuestCompleted(false);
    setQuestNotice('');
    const spawnCellX = Math.max(0, Math.min(fogGridSize - 1, Math.floor(((spawnPoint.x + 5) / 10) * fogGridSize)));
    const spawnCellZ = Math.max(0, Math.min(fogGridSize - 1, Math.floor(((spawnPoint.z + 5) / 10) * fogGridSize)));
    const spawnCellKey = `${spawnCellX}:${spawnCellZ}`;
    visitedCellsRef.current = new Set([spawnCellKey]);
    setVisitedCells([spawnCellKey]);
  }, [fogGridSize, room.id, spawnPoint]);

  const itemById = useMemo(
    () => Object.fromEntries(room.items.map((item) => [item.id, item])),
    [room.items]
  );

  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  const selectedItemData = room.items.find((i) => i.id === selectedItem);
  const nearbyItem = nearbyItemId ? itemById[nearbyItemId] : null;
  const currentSizeIndex = sizes.indexOf(selectedItemData?.size || 'medium');
  const playerMiniMapLeft = ((explorerPosition.x + 5) / 10) * 100;
  const playerMiniMapTop = ((explorerPosition.z + 5) / 10) * 100;
  const questTargetId = questOrder[questIndex];
  const questTargetItem = questTargetId ? itemById[questTargetId] : null;
  const questTargetWorld = questTargetItem ? toWorldPosition(questTargetItem.position) : null;
  const questDistance = questTargetWorld
    ? Math.hypot(explorerPosition.x - questTargetWorld.x, explorerPosition.z - questTargetWorld.z)
    : null;
  const questDirection = questTargetWorld
    ? describeDirectionLabel(explorerPosition, { x: questTargetWorld.x, z: questTargetWorld.z })
    : null;
  const questProgressPercent = questOrder.length === 0
    ? 0
    : Math.round((Math.min(questIndex, questOrder.length) / questOrder.length) * 100);
  const visitedCellLookup = useMemo(() => new Set(visitedCells), [visitedCells]);

  const jumpCamera = (id: CameraWaypointId) => {
    setCameraCommand((prev) => ({ id, nonce: prev.nonce + 1 }));
  };

  const startQuest = () => {
    if (!room.items.length) {
      setQuestNotice('퀘스트를 시작하려면 최소 1개 이상의 기억 항목이 필요합니다.');
      return;
    }
    const ordered = room.items.map((item) => item.id);
    const nextOrder = questMode === 'shuffle' ? shuffleInPlace(ordered) : ordered;
    setQuestOrder(nextOrder);
    setQuestIndex(0);
    setQuestCompleted(false);
    setQuestActive(true);
    setQuestNotice('퀘스트 시작! 목표 앵커 위치로 이동하세요.');
  };

  useEffect(() => {
    if (!questNotice) return;
    const timer = window.setTimeout(() => setQuestNotice(''), 1700);
    return () => window.clearTimeout(timer);
  }, [questNotice]);

  useEffect(() => {
    if (!exploreMode || !questActive || questCompleted || !questTargetItem) return;

    const targetWorld = toWorldPosition(questTargetItem.position);
    const distance = Math.hypot(explorerPosition.x - targetWorld.x, explorerPosition.z - targetWorld.z);

    if (distance > 0.95) return;

    const isLastTarget = questIndex >= questOrder.length - 1;
    if (isLastTarget) {
      setQuestCompleted(true);
      setQuestActive(false);
      setQuestIndex((prev) => prev + 1);
      setQuestNotice('퀘스트 완료! 방 동선이 기억 경로로 고정되었습니다.');
      return;
    }

    setQuestIndex((prev) => prev + 1);
    setQuestNotice(`체크포인트 통과 (${questIndex + 1}/${questOrder.length})`);
  }, [exploreMode, questActive, questCompleted, questTargetItem, questIndex, questOrder.length, explorerPosition]);

  useEffect(() => {
    if (!exploreMode || room.items.length === 0) {
      setNearbyItemId(null);
      return;
    }

    let nearestId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const item of room.items) {
      const world = toWorldPosition(item.position);
      const distance = Math.hypot(explorerPosition.x - world.x, explorerPosition.z - world.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = item.id;
      }
    }

    setNearbyItemId(nearestDistance <= 1.08 ? nearestId : null);
  }, [exploreMode, explorerPosition, room.items]);

  useEffect(() => {
    if (exploreMode && nearbyItemId) return;
    setInteractionOpen(false);
    setInteractionReveal(false);
  }, [exploreMode, nearbyItemId]);

  useEffect(() => {
    if (!exploreMode) return;
    const cellX = Math.max(0, Math.min(fogGridSize - 1, Math.floor(((explorerPosition.x + 5) / 10) * fogGridSize)));
    const cellZ = Math.max(0, Math.min(fogGridSize - 1, Math.floor(((explorerPosition.z + 5) / 10) * fogGridSize)));
    const cellKey = `${cellX}:${cellZ}`;
    if (visitedCellsRef.current.has(cellKey)) return;
    visitedCellsRef.current.add(cellKey);
    setVisitedCells(Array.from(visitedCellsRef.current));
  }, [exploreMode, explorerPosition, fogGridSize]);

  useEffect(() => {
    if (!exploreMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if (key === 'e' && nearbyItemId) {
        event.preventDefault();
        setInteractionOpen(true);
        setInteractionReveal(false);
        onSelectItem(nearbyItemId);
      }
      if (key === 'escape') {
        setInteractionOpen(false);
        setInteractionReveal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exploreMode, nearbyItemId, onSelectItem]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key.toLowerCase() !== 'h') return;
      event.preventDefault();
      setHudMinimal((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="relative w-full h-[600px] rounded-lg overflow-hidden border border-gray-200"
      style={{ background: `linear-gradient(to bottom, ${biomePack.skyFrom}, ${biomePack.skyTo})` }}
    >
      <Canvas shadows>
        <Scene
          room={room}
          theme={theme}
          styleMode={styleMode}
          roomIndex={roomIndex}
          roomCount={roomCount}
          onPortalNavigate={onPortalNavigate}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onEditItem={onEditItem}
          onUpdateItem={onUpdateItem}
          exploreMode={exploreMode}
          spawnPoint={spawnPoint}
          cameraCommand={cameraCommand}
          onExplorerPositionChange={setExplorerPosition}
        />
      </Canvas>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            stylePack.id === 'voxel'
              ? 'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)'
              : 'none',
          backgroundSize: stylePack.id === 'voxel' ? '12px 12px' : 'auto',
          mixBlendMode: 'multiply',
          opacity: stylePack.id === 'voxel' ? 0.55 : 0,
        }}
      />

      <div className="pointer-events-none absolute inset-0" style={{ background: stylePack.pixelOverlayTone }} />

      {!hudMinimal && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-xl bg-white/88 px-4 py-2 text-center shadow">
          <p className="text-sm font-bold text-slate-900">{room.name}</p>
          <p className="text-[11px] font-medium text-slate-600">
            {theme.label} · {biomePack.label}
          </p>
        </div>
      )}

      {!hudMinimal && selectedItem && onUpdateItem && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg">
          <div className="text-xs font-bold text-gray-700 mb-2">📐 크기</div>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => currentSizeIndex > 0 && onUpdateItem(selectedItem, { size: sizes[currentSizeIndex - 1] })}
              disabled={currentSizeIndex === 0}
              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded font-bold disabled:opacity-40"
            >−</button>
            <span className="w-12 text-center text-xs">{['작게', '보통', '크게'][currentSizeIndex]}</span>
            <button
              onClick={() => currentSizeIndex < 2 && onUpdateItem(selectedItem, { size: sizes[currentSizeIndex + 1] })}
              disabled={currentSizeIndex === 2}
              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded font-bold disabled:opacity-40"
            >+</button>
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2 text-[10px] text-gray-500 space-y-1">
            <div>🖱️ 드래그: 바닥 이동</div>
            <div>⇧+드래그: 높이 조절</div>
            {stylePack.blockSnap && <div>🧱 VOXEL 스냅: 위치가 블록 격자에 맞춰집니다</div>}
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={() => setHudMinimal((prev) => !prev)}
          className="rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow hover:bg-slate-100"
        >
          {hudMinimal ? 'HUD 펼치기' : 'HUD 최소화'}
        </button>
      </div>

      {!hudMinimal && (
        controlPanelCollapsed ? (
          <div className="absolute top-14 right-4 z-10 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={() => setControlPanelCollapsed(false)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              탐험 / 시점 패널 열기
            </button>
          </div>
        ) : (
          <div className="absolute top-14 right-4 w-[272px] rounded-lg bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-700">탐험 / 시점</p>
              <button
                type="button"
                onClick={() => setControlPanelCollapsed(true)}
                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200"
              >
                접기
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setExploreMode((prev) => !prev)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  exploreMode ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {exploreMode ? '탐험 ON' : '탐험 OFF'}
              </button>
              <button
                type="button"
                onClick={() => jumpCamera('center')}
                className="rounded-md bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                중앙
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <button type="button" onClick={() => jumpCamera('north')} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200">북</button>
              <button type="button" onClick={() => jumpCamera('west')} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200">서</button>
              <button type="button" onClick={() => jumpCamera('east')} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200">동</button>
              <button type="button" onClick={() => jumpCamera('south')} className="col-span-3 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200">남</button>
            </div>

            {roomCount > 1 && onPortalNavigate && (
              <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => canPortalPrev && onPortalNavigate('prev')}
                    disabled={!canPortalPrev}
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      canPortalPrev
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    ← 이전 방 포털
                  </button>
                  <p className="text-[11px] font-semibold text-slate-600">
                    {roomIndex + 1} / {roomCount}
                  </p>
                  <button
                    type="button"
                    onClick={() => canPortalNext && onPortalNavigate('next')}
                    disabled={!canPortalNext}
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      canPortalNext
                        ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    다음 방 포털 →
                  </button>
                </div>
              </div>
            )}

            <p className="mt-2 text-[10px] text-slate-500">
              {exploreMode ? 'WASD / 방향키 + Space 점프 + E 상호작용' : '시점 포털로 빠른 탐색'}
            </p>

            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-700">회상 퀘스트</p>
                <div className="flex rounded border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuestMode('path')}
                    className={`px-2 py-0.5 text-[10px] font-semibold ${questMode === 'path' ? 'bg-rose-500 text-white' : 'bg-white text-slate-600'}`}
                  >
                    경로
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestMode('shuffle')}
                    className={`px-2 py-0.5 text-[10px] font-semibold ${questMode === 'shuffle' ? 'bg-rose-500 text-white' : 'bg-white text-slate-600'}`}
                  >
                    랜덤
                  </button>
                </div>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={startQuest}
                  className="flex-1 rounded bg-rose-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
                >
                  {questCompleted ? '다시 시작' : questActive ? '재시작' : '퀘스트 시작'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuestActive(false);
                    setQuestCompleted(false);
                    setQuestOrder([]);
                    setQuestIndex(0);
                  }}
                  className="rounded bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  중지
                </button>
              </div>

              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
                <div className="h-1.5 rounded-full bg-rose-500 transition-all" style={{ width: `${questProgressPercent}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                진행도 {Math.min(questIndex, questOrder.length)} / {questOrder.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-700">
                목표: {questTargetItem ? `${questTargetItem.image || '📍'} ${questTargetItem.content}` : '퀘스트를 시작하세요'}
              </p>
              {questActive && questDistance !== null && questDirection && (
                <p className="mt-1 text-[10px] text-slate-500">
                  남은 거리 약 {questDistance.toFixed(1)}m · 방향 {questDirection}
                </p>
              )}
              {questNotice && (
                <p className="mt-1 rounded bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">{questNotice}</p>
              )}
            </div>
          </div>
        )
      )}

      {exploreMode && nearbyItem && !interactionOpen && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-lg">
          `E` 키로 앵커 상호작용 · {nearbyItem.image || '📍'} {nearbyItem.content}
        </div>
      )}

      {exploreMode && nearbyItem && interactionOpen && (
        <div className="absolute bottom-4 left-1/2 z-20 w-[340px] max-w-[92%] -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">ANCHOR INTERACTION</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {nearbyItem.image || '📍'} {nearbyItem.content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setInteractionOpen(false);
                setInteractionReveal(false);
              }}
              className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              닫기
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">앵커에 연결된 의미를 먼저 떠올린 뒤 정답 공개를 누르세요.</p>
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            {interactionReveal ? (
              <p className="text-sm font-semibold text-slate-900">{nearbyItem.content}</p>
            ) : (
              <p className="text-sm text-slate-500">정답을 떠올리는 중...</p>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setInteractionReveal((prev) => !prev)}
              className="flex-1 rounded bg-emerald-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              {interactionReveal ? '정답 숨기기' : '정답 보기'}
            </button>
            <button
              type="button"
              onClick={() => onEditItem(nearbyItem)}
              className="rounded bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              내용 편집
            </button>
          </div>
        </div>
      )}

      {!hudMinimal && (
        <div className="absolute bottom-4 right-4 rounded-lg bg-slate-900/82 p-3 shadow-xl">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-200">MINI MAP</p>
        <div className="relative mt-2 h-36 w-36 overflow-hidden rounded border border-slate-600 bg-slate-800">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:24px_24px]" />
          {room.items.map((item) => (
            <div
              key={`mini-${item.id}`}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70"
              style={{
                left: `${item.position.x}%`,
                top: `${item.position.y}%`,
                backgroundColor:
                  questActive && !questCompleted && questTargetItem?.id === item.id
                    ? '#facc15'
                    : item.id === selectedItem
                      ? '#f59e0b'
                      : '#38bdf8',
              }}
              title={item.content}
            />
          ))}
          {exploreMode &&
            Array.from({ length: fogGridSize * fogGridSize }).map((_, index) => {
              const gx = index % fogGridSize;
              const gz = Math.floor(index / fogGridSize);
              const key = `${gx}:${gz}`;
              if (visitedCellLookup.has(key)) return null;
              return (
                <div
                  key={`fog-${key}`}
                  className="absolute bg-slate-950/68"
                  style={{
                    left: `${(gx / fogGridSize) * 100}%`,
                    top: `${(gz / fogGridSize) * 100}%`,
                    width: `${100 / fogGridSize}%`,
                    height: `${100 / fogGridSize}%`,
                  }}
                />
              );
            })}
          {exploreMode && (
            <div
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
              style={{
                left: `${Math.max(0, Math.min(100, playerMiniMapLeft))}%`,
                top: `${Math.max(0, Math.min(100, playerMiniMapTop))}%`,
              }}
            />
          )}
        </div>
      </div>
      )}

      {!hudMinimal && (
        <div className="absolute bottom-4 left-4 max-w-[260px] rounded-lg bg-white/92 p-3 shadow-lg backdrop-blur">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-indigo-700">RPG MEMORY THEME</p>
        <p className="mt-1 text-sm font-bold text-slate-900">{theme.label}</p>
        <p className="mt-1 text-[11px] text-slate-500">스타일: {stylePack.label}</p>
        <p className="mt-1 text-[11px] text-slate-500">바이옴: {biomePack.label}</p>
        <p className="mt-1 text-[11px] text-slate-500">구조: {layoutLabels[theme.layout.pattern]}</p>
        <p className="mt-2 text-xs font-semibold text-slate-600">핵심 랜드마크</p>
        <div className="mt-1 space-y-0.5 text-xs text-slate-600">
          {theme.landmarkHints.map((hint) => (
            <p key={hint}>• {hint}</p>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

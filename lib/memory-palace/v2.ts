import type {
  LegacyMemoryItem,
  LegacyMemoryRoom,
  MemoryAnchorShape,
  MemoryAnchorSize,
  MemoryPalaceDocumentV2,
  PalaceAnchorV2,
  PalaceRoomV2,
  PalaceV2,
} from '@/types/learning-space';

function toStringValue(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

function clampFinite(value: unknown, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function normalizeShape(shape: unknown): MemoryAnchorShape {
  if (shape === 'box' || shape === 'sphere' || shape === 'cylinder' || shape === 'pyramid' || shape === 'card') {
    return shape;
  }
  if (shape === 'cube') return 'box';
  return 'card';
}

function normalizeSize(size: unknown): MemoryAnchorSize {
  if (size === 'small' || size === 'medium' || size === 'large') return size;
  return 'medium';
}

function normalizeAnchor(anchor: Partial<PalaceAnchorV2> | LegacyMemoryItem, index: number): PalaceAnchorV2 {
  const legacyAnchor = anchor as LegacyMemoryItem;
  const v2Anchor = anchor as Partial<PalaceAnchorV2>;

  const id = toStringValue(anchor.id, `anchor-${index + 1}`);
  const content = toStringValue(anchor.content, `기억 항목 ${index + 1}`);
  const image = typeof anchor.image === 'string' && anchor.image.trim().length > 0 ? anchor.image.trim() : undefined;

  const fallbackColor = '#3b82f6';
  const colorSource = v2Anchor.style?.color ?? legacyAnchor.color;

  return {
    id,
    content,
    image,
    position: {
      x: clampFinite(anchor.position?.x, 5, 95),
      y: clampFinite(anchor.position?.y, 5, 95),
      z: anchor.position && typeof (anchor.position as { z?: unknown }).z !== 'undefined'
        ? clampFinite((anchor.position as { z?: unknown }).z, 0, 10)
        : undefined,
    },
    style: {
      shape: normalizeShape(v2Anchor.style?.shape ?? legacyAnchor.shape),
      size: normalizeSize(v2Anchor.style?.size ?? legacyAnchor.size),
      color: toStringValue(colorSource, fallbackColor),
      height: typeof v2Anchor.style?.height !== 'undefined'
        ? clampFinite(v2Anchor.style?.height, 0.5, 5)
        : typeof legacyAnchor.height !== 'undefined'
          ? clampFinite(legacyAnchor.height, 0.5, 5)
          : undefined,
    },
  };
}

function normalizeRoom(room: Partial<PalaceRoomV2> | LegacyMemoryRoom, index: number): PalaceRoomV2 {
  const legacyRoom = room as LegacyMemoryRoom;
  const v2Room = room as Partial<PalaceRoomV2>;
  const id = toStringValue(room.id, `room-${index + 1}`);
  const name = toStringValue(room.name, `방 ${index + 1}`);
  const description = toStringValue(room.description, '');
  const themeColor = toStringValue(v2Room.themeColor ?? legacyRoom.color, '#3b82f6');
  const rawAnchors = Array.isArray(v2Room.anchors)
    ? v2Room.anchors
    : Array.isArray(legacyRoom.items)
      ? legacyRoom.items
      : [];

  return {
    id,
    name,
    description,
    themeColor,
    anchors: rawAnchors.map((anchor: Partial<PalaceAnchorV2> | LegacyMemoryItem, anchorIndex: number) =>
      normalizeAnchor(anchor, anchorIndex)
    ),
  };
}

export function legacyRoomsToPalaceV2(input: unknown): PalaceV2 {
  const rooms = Array.isArray(input)
    ? input.map((room, index) => normalizeRoom(room as LegacyMemoryRoom, index))
    : [normalizeRoom({} as LegacyMemoryRoom, 0)];

  return {
    version: 'v2',
    rooms: rooms.length > 0 ? rooms : [normalizeRoom({} as LegacyMemoryRoom, 0)],
  };
}

export function palaceV2ToLegacyRooms(palace: PalaceV2): LegacyMemoryRoom[] {
  return palace.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    color: room.themeColor,
    items: room.anchors.map((anchor) => ({
      id: anchor.id,
      content: anchor.content,
      image: anchor.image,
      position: {
        x: clampFinite(anchor.position.x, 5, 95),
        y: clampFinite(anchor.position.y, 5, 95),
      },
      shape: normalizeShape(anchor.style.shape),
      size: normalizeSize(anchor.style.size),
      color: toStringValue(anchor.style.color, '#3b82f6'),
      height: typeof anchor.style.height === 'number'
        ? clampFinite(anchor.style.height, 0.5, 5)
        : undefined,
    })),
  }));
}

export function normalizePalaceV2(input: unknown): PalaceV2 {
  if (input && typeof input === 'object') {
    const candidate = input as Partial<PalaceV2>;
    if (Array.isArray(candidate.rooms)) {
      const rooms = candidate.rooms.map((room, index) => normalizeRoom(room, index));
      return {
        version: 'v2',
        rooms: rooms.length > 0 ? rooms : [normalizeRoom({} as PalaceRoomV2, 0)],
      };
    }
  }

  return legacyRoomsToPalaceV2(input);
}

export function normalizeMemoryPalaceDocumentV2<T extends { _id?: unknown; title?: string; rooms?: unknown; palace?: unknown; createdAt?: unknown; updatedAt?: unknown }>(
  source: T
): MemoryPalaceDocumentV2 {
  const palace = normalizePalaceV2(source.palace ?? source.rooms);
  return {
    _id: String(source._id || ''),
    title: toStringValue(source.title, '새 기억 궁전'),
    palace,
    rooms: palaceV2ToLegacyRooms(palace),
    schemaVersion: 'v2',
    createdAt: source.createdAt ? String(source.createdAt) : undefined,
    updatedAt: source.updatedAt ? String(source.updatedAt) : undefined,
  };
}

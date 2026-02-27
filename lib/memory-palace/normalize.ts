export type MemoryItemShape = 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
export type MemoryItemSize = 'small' | 'medium' | 'large';

export interface NormalizedMemoryItem {
  id: string;
  content: string;
  position: { x: number; y: number };
  image?: string;
  shape: MemoryItemShape;
  size: MemoryItemSize;
  color?: string;
  height?: number;
}

export interface NormalizedMemoryRoom {
  id: string;
  name: string;
  description: string;
  color: string;
  items: NormalizedMemoryItem[];
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeShape(shape: any): MemoryItemShape {
  if (shape === 'cube') return 'box';
  if (shape === 'box' || shape === 'sphere' || shape === 'cylinder' || shape === 'pyramid' || shape === 'card') {
    return shape;
  }
  return 'card';
}

function normalizeSize(size: any): MemoryItemSize {
  if (size === 'small' || size === 'medium' || size === 'large') return size;
  return 'medium';
}

function normalizeItem(item: any, index: number): NormalizedMemoryItem {
  return {
    id: String(item?.id || `item-${Date.now()}-${index}`),
    content: String(item?.content || '기억 항목'),
    image: typeof item?.image === 'string' ? item.image : undefined,
    position: {
      x: clamp(Number(item?.position?.x ?? 50), 5, 95),
      y: clamp(Number(item?.position?.y ?? 50), 5, 95),
    },
    shape: normalizeShape(item?.shape),
    size: normalizeSize(item?.size),
    color: typeof item?.color === 'string' ? item.color : '#3b82f6',
    height: Number.isFinite(item?.height) ? clamp(Number(item.height), 0.5, 5) : undefined,
  };
}

function normalizeRoom(room: any, index: number, fallbackTitle = '기억의 궁전'): NormalizedMemoryRoom {
  const items = Array.isArray(room?.items) ? room.items : [];

  return {
    id: String(room?.id || `room-${Date.now()}-${index}`),
    name: String(room?.name || `${fallbackTitle} - 방 ${index + 1}`),
    description: String(room?.description || ''),
    color: typeof room?.color === 'string' ? room.color : '#3b82f6',
    items: items.map((item: any, itemIndex: number) => normalizeItem(item, itemIndex)),
  };
}

/**
 * Compatibility strategy:
 * - new schema: rooms: Room[]
 * - legacy schema: rooms: { description, items, ... }
 */
export function normalizeMemoryPalaceRooms(rooms: any, fallbackTitle = '기억의 궁전'): NormalizedMemoryRoom[] {
  if (Array.isArray(rooms)) {
    const normalized = rooms.map((room, index) => normalizeRoom(room, index, fallbackTitle));
    return normalized.length > 0 ? normalized : [normalizeRoom({}, 0, fallbackTitle)];
  }

  if (rooms && typeof rooms === 'object') {
    const legacyItems = Array.isArray(rooms.items) ? rooms.items : [];
    return [
      normalizeRoom(
        {
          id: rooms.id || 'room-legacy',
          name: rooms.name || `${fallbackTitle} - 기본 방`,
          description: rooms.description || `${fallbackTitle}의 핵심 기억 항목`,
          color: rooms.color || '#3b82f6',
          items: legacyItems,
        },
        0,
        fallbackTitle
      ),
    ];
  }

  return [normalizeRoom({}, 0, fallbackTitle)];
}

export function normalizeMemoryPalaceDocument<T extends { title?: string; rooms?: any }>(palace: T) {
  return {
    ...palace,
    rooms: normalizeMemoryPalaceRooms(palace.rooms, palace.title || '기억의 궁전'),
  };
}

export type LearningSchemaVersion = 'v2';

export type MemoryAnchorShape = 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
export type MemoryAnchorSize = 'small' | 'medium' | 'large';
export type CurriculumDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface CurriculumLegacyTopic {
  topicId: string;
  title: string;
  order: number;
  conceptIds: string[];
}

export interface CurriculumLegacyModule {
  moduleId: string;
  title: string;
  order: number;
  estimatedHours: number;
  topics: CurriculumLegacyTopic[];
}

export interface CurriculumTopicV2 {
  topicId: string;
  title: string;
  order: number;
  learningObjectives: string[];
  keyPoints: string[];
  example?: string;
  memoryHint?: string;
  checkpointQuestion?: string;
}

export interface CurriculumModuleV2 {
  moduleId: string;
  title: string;
  order: number;
  estimatedHours: number;
  moduleSummary?: string;
  moduleObjectives: string[];
  topics: CurriculumTopicV2[];
}

export interface CurriculumLearningMetaV2 {
  prerequisites: string[];
  targetOutcomes: string[];
  studyTips: string[];
  recommendedWeeklyHours: number;
}

export interface CurriculumQualityV2 {
  score: number;
  readability: number;
  completeness: number;
  memorability: number;
  strengths: string[];
  warnings: string[];
}

export interface CurriculumDocumentV2 {
  _id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: CurriculumDifficulty;
  aiModel: string;
  structure: CurriculumLegacyModule[];
  structureV2: CurriculumModuleV2[];
  learningMeta: CurriculumLearningMetaV2;
  quality: CurriculumQualityV2;
  schemaVersion: LearningSchemaVersion;
  progress: {
    completedTopics: string[];
    currentModule: string;
    overallPercentage: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface LegacyMindMapNode {
  id: string;
  name: string;
  image?: string;
  children?: LegacyMindMapNode[];
  fx?: number;
  fy?: number;
}

export interface LegacyMemoryItem {
  id: string;
  content: string;
  position: { x: number; y: number };
  image?: string;
  shape?: MemoryAnchorShape;
  size?: MemoryAnchorSize;
  color?: string;
  height?: number;
}

export interface LegacyMemoryRoom {
  id: string;
  name: string;
  description: string;
  color: string;
  items: LegacyMemoryItem[];
}

export interface MindmapNodeV2 {
  id: string;
  label: string;
  image?: string;
  parentId?: string | null;
  position?: { x: number; y: number };
  depth?: number;
}

export interface MindmapEdgeV2 {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  strength?: number;
}

export interface MindmapLayoutV2 {
  type: 'radial' | 'tree' | 'horizontal' | 'force';
}

export interface MindmapV2 {
  version: LearningSchemaVersion;
  rootNodeId: string;
  nodes: MindmapNodeV2[];
  edges: MindmapEdgeV2[];
  layout: MindmapLayoutV2;
}

export interface PalaceAnchorV2 {
  id: string;
  content: string;
  image?: string;
  position: { x: number; y: number; z?: number };
  style: {
    shape: MemoryAnchorShape;
    size: MemoryAnchorSize;
    color: string;
    height?: number;
  };
  mnemonic?: {
    cue?: string;
    tags?: string[];
  };
}

export interface PalaceRoomV2 {
  id: string;
  name: string;
  description: string;
  themeColor: string;
  anchors: PalaceAnchorV2[];
}

export interface PalaceV2 {
  version: LearningSchemaVersion;
  rooms: PalaceRoomV2[];
}

export interface MindmapDocumentV2 {
  _id: string;
  title: string;
  mindmap: MindmapV2;
  structure: LegacyMindMapNode;
  schemaVersion: LearningSchemaVersion;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemoryPalaceDocumentV2 {
  _id: string;
  title: string;
  palace: PalaceV2;
  rooms: LegacyMemoryRoom[];
  schemaVersion: LearningSchemaVersion;
  createdAt?: string;
  updatedAt?: string;
}

// Tipos del contrato congelado de TropelCare Control API.
// Fuente: indicaciones-backend.md (DTOs, enums y respuestas).
// No usar `any` para respuestas de API.

// ---- Enums del dominio ----
export const SPECIES = ['BLOBITO', 'CHISPA', 'GRUNON', 'DORMILON', 'GLITCHY'] as const;
export type Species = (typeof SPECIES)[number];

export const VITAL_STATES = ['ESTABLE', 'HAMBRIENTO', 'AGITADO', 'MUTANDO', 'CRITICO'] as const;
export type VitalState = (typeof VITAL_STATES)[number];

export const SIGNAL_TYPES = [
  'HAMBRE',
  'ABANDONO',
  'MUTACION',
  'FUGA',
  'CONFLICTO',
  'REPRODUCCION_MASIVA',
  'SENAL_CORRUPTA',
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SEVERITIES = ['LEVE', 'MODERADO', 'GRAVE', 'CRITICO'] as const;
export type Severity = (typeof SEVERITIES)[number];

// Estado completo del modelo de datos.
export const SIGNAL_STATUSES = ['RECIBIDA', 'PROCESANDO', 'ATENDIDA'] as const;
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

// Solo estos estados se aceptan en el PATCH.
export const PATCHABLE_STATUSES = ['PROCESANDO', 'ATENDIDA'] as const;
export type PatchableStatus = (typeof PATCHABLE_STATUSES)[number];

export const CLIMATES = [
  'PIXEL_FOREST',
  'NEON_CAVE',
  'CLOUD_AQUARIUM',
  'RETRO_ARCADE',
] as const;
export type Climate = (typeof CLIMATES)[number];

// ---- Auth ----
export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  teamCode: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

// ---- Dashboard ----
export interface DashboardSummary {
  totalTropels: number;
  criticalTropels: number;
  openSignals: number;
  sectorStabilityAvg: number;
  signalsBySeverity: Record<Severity, number>;
  generatedAt: string;
}

// ---- Tropel ----
export interface TropelSectorRef {
  id: string;
  name: string;
  sectorCode: string;
}

export interface Tropel {
  id: string;
  name: string;
  species: Species;
  vitalState: VitalState;
  energyLevel: number;
  chaosIndex: number;
  mutationStage: number;
  guardianName: string;
  sector: TropelSectorRef;
  createdAt: string;
  updatedAt: string;
}

export interface TropelPage {
  content: Tropel[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

export const TROPEL_SORTS = ['name,asc', 'updatedAt,desc', 'chaosIndex,desc'] as const;
export type TropelSort = (typeof TROPEL_SORTS)[number];

export const PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

// ---- Signal ----
export interface SignalTropelRef {
  id: string;
  name: string;
  species: Species;
}

export interface Signal {
  id: string;
  signalType: SignalType;
  severity: Severity;
  status: SignalStatus;
  rawContent: string;
  tropel: SignalTropelRef;
  createdAt: string;
  updatedAt: string;
}

export interface SignalFeedResponse {
  items: Signal[];
  nextCursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
}

// ---- Sectores ----
export interface SectorListItem {
  id: string;
  sectorCode: string;
  name: string;
  climate: Climate;
  capacity: number;
  currentLoad: number;
  stabilityLevel: number;
}

export interface SectorsResponse {
  items: SectorListItem[];
}

export interface StoryStageMetrics {
  stability: number;
  energy: number;
  alerts: number;
}

export interface StoryStage {
  id: string;
  order: number;
  title: string;
  narrative: string;
  dominantEvent: SignalType;
  metrics: StoryStageMetrics;
  assetKey: string;
  colorToken: string;
  progress: number;
}

export interface SectorStoryRef {
  id: string;
  name: string;
  climate: Climate;
}

export interface SectorStoryResponse {
  sector: SectorStoryRef;
  stages: StoryStage[];
}

// ---- Errores ----
export interface ApiErrorBody {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

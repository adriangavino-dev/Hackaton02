import { apiClient } from './apiClient';
import type {
  AuthUser,
  DashboardSummary,
  LoginResponse,
  PageSize,
  PatchableStatus,
  SectorStoryResponse,
  SectorsResponse,
  Signal,
  SignalFeedResponse,
  Severity,
  SignalStatus,
  SignalType,
  Species,
  Tropel,
  TropelPage,
  TropelSort,
  VitalState,
} from './types';

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// ---- Auth ----
export function login(
  teamCode: string,
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(
    '/auth/login',
    { teamCode, email, password },
    { signal, auth: false },
  );
}

export function fetchMe(signal?: AbortSignal): Promise<AuthUser> {
  return apiClient.get<AuthUser>('/auth/me', signal);
}

// ---- Dashboard ----
export function fetchDashboard(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>('/dashboard/summary', signal);
}

// ---- Tropeles ----
export interface TropelQuery {
  page: number;
  size: PageSize;
  species?: Species | '';
  vitalState?: VitalState | '';
  sectorId?: string;
  q?: string;
  sort: TropelSort;
}

export function fetchTropels(query: TropelQuery, signal?: AbortSignal): Promise<TropelPage> {
  const qs = buildQuery({
    page: query.page,
    size: query.size,
    species: query.species,
    vitalState: query.vitalState,
    sectorId: query.sectorId,
    q: query.q,
    sort: query.sort,
  });
  return apiClient.get<TropelPage>(`/tropels${qs}`, signal);
}

export function fetchTropel(id: string, signal?: AbortSignal): Promise<Tropel> {
  return apiClient.get<Tropel>(`/tropels/${encodeURIComponent(id)}`, signal);
}

// ---- Senales ----
export interface SignalFeedQuery {
  cursor?: string | null;
  limit: number;
  signalType?: SignalType | '';
  severity?: Severity | '';
  status?: SignalStatus | '';
  q?: string;
}

export function fetchSignalFeed(
  query: SignalFeedQuery,
  signal?: AbortSignal,
): Promise<SignalFeedResponse> {
  const qs = buildQuery({
    cursor: query.cursor ?? undefined,
    limit: query.limit,
    signalType: query.signalType,
    severity: query.severity,
    status: query.status,
    q: query.q,
  });
  return apiClient.get<SignalFeedResponse>(`/signals/feed${qs}`, signal);
}

export function fetchSignal(id: string, signal?: AbortSignal): Promise<Signal> {
  return apiClient.get<Signal>(`/signals/${encodeURIComponent(id)}`, signal);
}

export function updateSignalStatus(
  id: string,
  status: PatchableStatus,
  signal?: AbortSignal,
): Promise<Signal> {
  return apiClient.patch<Signal>(`/signals/${encodeURIComponent(id)}/status`, { status }, signal);
}

// ---- Sectores ----
export function fetchSectors(signal?: AbortSignal): Promise<SectorsResponse> {
  return apiClient.get<SectorsResponse>('/sectors', signal);
}

export function fetchSectorStory(id: string, signal?: AbortSignal): Promise<SectorStoryResponse> {
  return apiClient.get<SectorStoryResponse>(`/sectors/${encodeURIComponent(id)}/story`, signal);
}

export interface FleetSummaryResponse {
  devices_total: number;
  devices_online: number;
  online_pct: number;
  avg_cop_24h: number | null;
  low_deltaT_count_24h: number;
  max_heartbeat_age_sec: number | null;
  window_start_ms: number;
  generated_at: string;
}

export interface ClientCompactResponse {
  generated_at: string;
  scope: "fleet" | "tenant" | "empty";
  window_start_ms: number;
  kpis: {
    devices_total: number;
    devices_online: number;
    offline_count: number;
    online_pct: number;
    avg_cop: number | null;
    low_deltaT_count: number;
    open_alerts: number;
    max_heartbeat_age_sec: number | null;
  };
  alerts: CompactAlert[];
  top_devices: CompactTopDevice[];
  trend: CompactTrendPoint[];
}

export interface CompactAlert {
  device_id: string;
  lookup: string;
  site: string | null;
  ts: string;
  faults: string[];
  fault_count: number;
  updated_at: string | null;
  active: boolean;
}

export interface CompactTopDevice {
  device_id: string;
  lookup: string;
  site: string | null;
  online: boolean;
  last_seen_at: string | null;
  updated_at: string | null;
  cop: number | null;
  deltaT: number | null;
  thermalKW: number | null;
  alert_count: number;
}

export interface CompactTrendPoint {
  label: string;
  cop: number | null;
  thermalKW: number | null;
  deltaT: number | null;
}

export interface DeviceListResponse {
  items: DeviceListItem[];
  next: string | null;
}

export interface DeviceListItem {
  device_id: string;
  lookup: string;
  profile_id: string | null;
  online: boolean;
  last_seen_at: string | null;
  site: string | null;
  firmware: string | null;
  map_version: string | null;
}

export type TelemetryMetric =
  | "thermalKW"
  | "cop"
  | "deltaT"
  | "supplyC"
  | "returnC"
  | "flowLps"
  | "powerKW";

export interface TelemetryLatestSnapshot {
  ts?: number | null;
  updated_at?: string | null;
  online?: boolean | null;
  supplyC?: number | null;
  returnC?: number | null;
  deltaT?: number | null;
  thermalKW?: number | null;
  cop?: number | null;
  faults?: string[] | null;
  payload?: unknown;
  mode?: string | null;
  flowLps?: number | null;
  powerKW?: number | null;
  tankC?: number | null;
  ambientC?: number | null;
  compCurrentA?: number | null;
  eevSteps?: number | null;
  defrost?: number | null;
  cop_quality?: string | null;
  [key: string]: unknown;
}

export interface TelemetryLatestBatchItem {
  lookup: string;
  device_id: string;
  profile_id: string | null;
  site: string | null;
  online: boolean;
  last_seen_at: string | null;
  latest: TelemetryLatestSnapshot;
}

export interface TelemetryLatestBatchResponse {
  generated_at: string;
  items: TelemetryLatestBatchItem[];
  missing: string[];
}

export interface TelemetrySeriesMetricValue {
  avg: number | null;
  min?: number | null;
  max?: number | null;
}

export interface TelemetrySeriesEntry {
  bucket_start: string;
  sample_count: number;
  values: Record<string, TelemetrySeriesMetricValue>;
}

export interface TelemetrySeriesScopeDevice {
  type: "device";
  device_id: string;
  lookup: string;
}

export interface TelemetrySeriesScopeProfile {
  type: "profile";
  profile_ids: string[];
}

export interface TelemetrySeriesScopeFleet {
  type: "fleet";
  profile_ids: string[] | null;
}

export type TelemetrySeriesScope =
  | TelemetrySeriesScopeDevice
  | TelemetrySeriesScopeProfile
  | TelemetrySeriesScopeFleet;

export interface TelemetrySeriesResponse {
  generated_at: string;
  scope: TelemetrySeriesScope;
  interval_ms: number;
  window: {
    start: string;
    end: string;
  };
  metrics: TelemetryMetric[];
  series: TelemetrySeriesEntry[];
}

export interface AlertsFeedResponse {
  generated_at: string;
  items: AlertsFeedItem[];
  stats: {
    total: number;
    active: number;
  };
}

export interface AlertsFeedItem {
  device_id: string;
  lookup: string;
  site: string | null;
  ts: string;
  fault_count: number;
  faults: string[];
  active: boolean;
  active_faults: string[];
  last_update: string | null;
}

export interface CommissioningResponse {
  generated_at: string;
  summary: {
    total: number;
    ready: number;
  };
  devices: CommissioningDevice[];
}

export interface CommissioningDevice {
  device_id: string;
  lookup: string;
  site: string | null;
  online: boolean;
  last_seen_at: string | null;
  supplyC: number | null;
  returnC: number | null;
  deltaT: number | null;
  flowLps: number | null;
  cop: number | null;
  thermalKW: number | null;
  mode: string | null;
  defrost: number | null;
  powerKW: number | null;
  updated_at: string | null;
  progress?: number;
  checklist?: CommissioningChecklistItem[];
}

export interface CommissioningChecklistItem {
  key: string;
  label: string;
  detail: string;
  pass: boolean;
}

export interface AdminOverviewResponse {
  generated_at: string;
  scope: "admin" | "tenant" | "empty";
  tenants: AdminTenantRow[];
  ops: AdminOpsRow[];
  ops_summary: Record<string, number>;
  ops_window: OpsWindowMeta;
}

export interface AdminTenantRow {
  profile_id: string;
  device_count: number;
  online_count: number;
}

export interface AdminOpsRow {
  ts: string;
  route: string;
  status_code: number;
  duration_ms: number;
  device_id: string | null;
  lookup: string | null;
}

export interface OpsOverviewResponse {
  generated_at: string;
  scope: "admin";
  devices: {
    total: number;
    online: number;
    offline: number;
    offline_ratio: number;
  };
  ops: OpsMetricRow[];
  ops_summary: OpsSummary;
  thresholds: OpsThresholds | null;
  recent: OpsRecentEvent[];
  ops_window: OpsWindowMeta;
}

export interface OpsMetricRow {
  route: string;
  status_code: number;
  count: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  max_duration_ms: number;
}

export interface OpsSummary {
  total_requests: number;
  server_error_rate: number;
  client_error_rate: number;
  slow_rate: number;
  slow_routes: OpsSlowRoute[];
  top_server_error_routes: OpsErrorRoute[];
}

export interface OpsSlowRoute {
  route: string;
  status_code: number;
  avg_duration_ms: number;
  count: number;
}

export interface OpsErrorRoute {
  route: string;
  status_code: number;
  count: number;
}

export interface OpsThresholds {
  error_rate: { warn: number; critical: number };
  client_error_rate: { warn: number; critical: number };
  avg_duration_ms: { warn: number; critical: number };
}

export interface OpsRecentEvent {
  ts: string;
  route: string;
  status_code: number;
  duration_ms: number;
  device_id: string | null;
  lookup: string | null;
}

export interface OpsWindowMeta {
  start: string;
  days: number;
}

export interface ArchiveResponse {
  generated_at: string;
  offline: ArchiveOfflineEntry[];
  history: ArchiveHistoryEntry[];
}

export interface ArchiveOfflineEntry {
  device_id: string;
  lookup: string;
  site: string | null;
  last_seen_at: string | null;
  online: boolean;
  cop: number | null;
  deltaT: number | null;
  alerts: number;
  updated_at: string | null;
}

export interface ArchiveHistoryEntry {
  day: string;
  samples: number;
}


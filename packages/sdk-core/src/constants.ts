export const SAFE_METRICS = [
  "supplyC",
  "returnC",
  "flowLps",
  "powerKW",
  "COP",
  "pressureHigh",
  "pressureLow",
  "status_code",
  "fault_code",
  "control_mode",
  "timestamp_minute",
  "energyKWh",
  "cycleCount",
  "uptimeMinutes",
] as const;

export type SafeMetric = (typeof SAFE_METRICS)[number];

export const DROP_FIELDS = [
  "name",
  "fullName",
  "address",
  "street",
  "city",
  "province",
  "postal",
  "phone",
  "email",
  "ip",
  "mac",
  "serial",
  "deviceIdRaw",
  "notes",
  "gps",
  "lat",
  "lng",
  "photo",
  "image",
  "freeText",
  "rawPayload",
  "hostname",
  "ssid",
  "wifi_ssid",
  "bssid",
  "router_mac",
  "imei",
  "imsi",
  "meid",
  "geohash",
  "ssid_password",
] as const;

export type DropField = (typeof DROP_FIELDS)[number];

export const SAFE_METRICS_SET = new Set<SafeMetric>(SAFE_METRICS);
export const DROP_FIELDS_SET = new Set<DropField>(DROP_FIELDS);

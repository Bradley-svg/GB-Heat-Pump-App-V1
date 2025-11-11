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
  "energyKWh",
  "cycleCount",
  "uptimeMinutes",
  "timestamp_minute"
] as const;

export const DROP_FIELDS = [
  "name",
  "fullName",
  "address",
  "phone",
  "phoneNumber",
  "email",
  "ip",
  "ipAddress",
  "mac",
  "macAddress",
  "serial",
  "serialNumber",
  "imei",
  "imsi",
  "meid",
  "gps",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "geohash",
  "ssid",
  "bssid",
  "hostname",
  "ssid_password",
  "router_mac",
  "photo",
  "image",
  "notes",
  "freeText",
  "rawPayload"
] as const;

export const EMBEDDED_IDENTIFIER_REGEX =
  /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b|\b\d{15}\b|(-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,})/gi;

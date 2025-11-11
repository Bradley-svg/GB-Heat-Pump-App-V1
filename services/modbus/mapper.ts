import type { TelemetryMetrics } from "../../packages/sdk-core/src/schemas";

type MetricKey = keyof TelemetryMetrics;

export interface RegisterDefinition {
  index: number;
  scale?: number;
  signed?: boolean;
  precision?: number;
}

export type MetricLayout = Partial<Record<MetricKey, RegisterDefinition>>;

export interface FaultBitMapping {
  index: number;
  map: Record<number, string>;
}

export interface RssiRegister {
  index: number;
  scale?: number;
  signed?: boolean;
}

export interface MapRegistersOptions {
  layout?: MetricLayout;
  faultBits?: FaultBitMapping;
  rssi?: RssiRegister;
  modeMap?: Record<number, TelemetryMetrics["control_mode"]>;
}

export interface TelemetryFromRegisters {
  metrics: TelemetryMetrics;
  faults: string[];
  rssi: number | null;
}

const DEFAULT_LAYOUT: MetricLayout = {
  supplyC: { index: 0, scale: 0.1, signed: true, precision: 1 },
  returnC: { index: 1, scale: 0.1, signed: true, precision: 1 },
  tankC: { index: 2, scale: 0.1, signed: true, precision: 1 },
  ambientC: { index: 3, scale: 0.1, signed: true, precision: 1 },
  flowLps: { index: 4, scale: 0.01, signed: false, precision: 3 },
  compCurrentA: { index: 5, scale: 0.1, signed: false, precision: 1 },
  eevSteps: { index: 6, signed: false },
  powerKW: { index: 7, scale: 0.1, signed: false, precision: 1 },
  control_mode: { index: 8, signed: false },
  defrost: { index: 9, scale: 0.01, signed: false, precision: 2 }
};

const DEFAULT_MODE_MAP: Record<number, TelemetryMetrics["control_mode"]> = {
  0: "OFF",
  1: "AUTO",
  2: "MANUAL",
  3: "SAFE"
};

export function mapRegistersToTelemetry(
  registers: number[] | Record<number, number | undefined>,
  options: MapRegistersOptions = {}
): TelemetryFromRegisters {
  const layout = { ...DEFAULT_LAYOUT, ...(options.layout || {}) };
  const metrics: TelemetryMetrics = {};

  (Object.keys(layout) as MetricKey[]).forEach((key) => {
    const entry = layout[key];
    if (!entry) return;
    const raw = readRegister(registers, entry.index);
    if (raw == null) {
      return;
    }
    const value = formatValue(entry, raw);
    if (key === "control_mode") {
      const modeMap = { ...DEFAULT_MODE_MAP, ...(options.modeMap || {}) };
      metrics[key] = (modeMap[value] ?? modeMap[Math.trunc(value)] ?? value.toString()) as TelemetryMetrics["control_mode"];
      return;
    }
    (metrics as any)[key] = value;
  });

  const faults = deriveFaults(registers, options.faultBits);
  const rssi = deriveRssi(registers, options.rssi);

  return { metrics, faults, rssi };
}

export interface RegisterWrite {
  address: number;
  value: number;
}

export interface MapMetricsToRegistersOptions {
  layout?: MetricLayout;
}

export function mapTelemetryToRegisters(
  metrics: Partial<TelemetryMetrics>,
  options: MapMetricsToRegistersOptions = {}
): RegisterWrite[] {
  const layout = { ...DEFAULT_LAYOUT, ...(options.layout || {}) };
  const writes: RegisterWrite[] = [];

  Object.entries(metrics).forEach(([key, value]) => {
    if (value == null) return;
    const entry = layout[key as MetricKey];
    if (!entry) return;
    const numericValue = key === "control_mode" ? encodeControlMode(value as TelemetryMetrics["control_mode"]) : Number(value);
    const scale = entry.scale ?? 1;
    const scaled = Math.round(numericValue / scale);
    writes.push({ address: entry.index, value: normalizeUnsigned16(scaled) });
  });

  return writes;
}

function readRegister(source: number[] | Record<number, number | undefined>, index: number): number | null {
  if (index == null) return null;
  if (Array.isArray(source)) {
    return typeof source[index] === "number" ? source[index]! : null;
  }
  const candidate = index in source ? source[index]! : undefined;
  return typeof candidate === "number" ? candidate : null;
}

function formatValue(entry: RegisterDefinition, raw: number): number {
  const signedValue = entry.signed ? toSigned16(raw) : raw;
  const scale = entry.scale ?? 1;
  const precision = entry.precision ?? 1;
  const numeric = signedValue * scale;
  return Number(numeric.toFixed(precision));
}

function deriveFaults(source: number[] | Record<number, number | undefined>, mapping?: FaultBitMapping): string[] {
  if (!mapping) return [];
  const raw = readRegister(source, mapping.index);
  if (raw == null) return [];
  const faults: string[] = [];
  Object.entries(mapping.map).forEach(([bit, code]) => {
    const bitIndex = Number(bit);
    if ((raw >> bitIndex) & 1) {
      faults.push(code);
    }
  });
  return faults;
}

function deriveRssi(source: number[] | Record<number, number | undefined>, config?: RssiRegister): number | null {
  if (!config) return null;
  const raw = readRegister(source, config.index);
  if (raw == null) return null;
  const signed = config.signed ?? true ? toSigned16(raw) : raw;
  const scale = config.scale ?? 1;
  return Number((signed * scale).toFixed(0));
}

function normalizeUnsigned16(value: number): number {
  const v = Math.round(value);
  if (v < 0) {
    return 0x10000 + v;
  }
  return v & 0xffff;
}

function toSigned16(value: number): number {
  return value >= 0x8000 ? value - 0x10000 : value;
}

function encodeControlMode(mode: TelemetryMetrics["control_mode"]): number {
  const entry = Object.entries(DEFAULT_MODE_MAP).find(([, name]) => name === mode);
  if (entry) {
    return Number(entry[0]);
  }
  const numeric = Number(mode);
  return Number.isFinite(numeric) ? numeric : 0;
}

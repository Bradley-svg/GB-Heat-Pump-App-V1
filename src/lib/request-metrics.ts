const recordedMetrics = new WeakMap<Request, boolean>();

export function initializeRequestMetrics(req: Request): void {
  recordedMetrics.set(req, false);
}

export function markRequestMetricsRecorded(req: Request): void {
  recordedMetrics.set(req, true);
}

export function requestMetricsRecorded(req: Request): boolean {
  return recordedMetrics.get(req) === true;
}

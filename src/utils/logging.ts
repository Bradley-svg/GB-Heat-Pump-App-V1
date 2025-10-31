import type { Env } from "../env";

type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  with(extra: LogFields): Logger;
}

interface LogEntry extends LogFields {
  ts: string;
  level: LogLevel;
  msg: string;
}

class JsonLogger implements Logger {
  private readonly base: LogFields;

  constructor(base: LogFields = {}) {
    this.base = pruneUndefined(base);
  }

  debug(message: string, fields?: LogFields) {
    this.emit("debug", message, fields);
  }

  info(message: string, fields?: LogFields) {
    this.emit("info", message, fields);
  }

  warn(message: string, fields?: LogFields) {
    this.emit("warn", message, fields);
  }

  error(message: string, fields?: LogFields) {
    this.emit("error", message, fields);
  }

  with(extra: LogFields): Logger {
    const merged: LogFields = { ...this.base, ...pruneUndefined(extra) };
    return new JsonLogger(merged);
  }

  private emit(level: LogLevel, message: string, fields?: LogFields) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg: message,
      ...this.base,
      ...pruneUndefined((fields ?? {}) as LogFields),
    };

    if (entry.error instanceof Error) {
      entry.error = serializeError(entry.error);
    } else if (entry.error && typeof entry.error === "object") {
      entry.error = normalizeErrorLike(entry.error as Record<string, unknown>);
    }

    writeLog(entry);
  }
}

const requestLoggers = new WeakMap<Request, Logger>();

export function bindRequestLogger(req: Request, _env: Env, extra?: LogFields): Logger {
  const base: LogFields = {
    request_id: deriveRequestId(req),
    method: req.method,
    path: safePath(req.url),
    host: safeHost(req.url),
    user_agent: headerOrNull(req, "user-agent"),
    client_ip: headerOrNull(req, "cf-connecting-ip"),
    cf_ray: headerOrNull(req, "cf-ray"),
    ...pruneUndefined((extra ?? {}) as LogFields),
  };

  const logger = new JsonLogger(base);
  requestLoggers.set(req, logger);
  return logger;
}

export function loggerForRequest(req: Request, extra?: LogFields): Logger {
  const existing = requestLoggers.get(req);
  if (existing) {
    return extra && Object.keys(extra).length ? existing.with(extra) : existing;
  }

  const logger = new JsonLogger(pruneUndefined((extra ?? {}) as LogFields));
  requestLoggers.set(req, logger);
  return logger;
}

export function releaseRequestLogger(req: Request) {
  requestLoggers.delete(req);
}

export function systemLogger(extra?: LogFields): Logger {
  return new JsonLogger({ scope: "system", ...pruneUndefined((extra ?? {}) as LogFields) });
}

export function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  if (typeof err === "string") {
    return { message: err };
  }
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    return {
      name: typeof obj.name === "string" ? obj.name : undefined,
      message: typeof obj.message === "string" ? obj.message : JSON.stringify(obj),
    };
  }
  return { message: String(err) };
}

function normalizeErrorLike(errorLike: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(errorLike)) {
    if (value instanceof Error) {
      normalized[key] = serializeError(value);
    } else if (typeof value === "bigint") {
      normalized[key] = value.toString();
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

function pruneUndefined(fields: LogFields): LogFields {
  const pruned: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value === "bigint") {
      pruned[key] = value.toString();
    } else if (value instanceof Error) {
      pruned[key] = serializeError(value);
    } else {
      pruned[key] = value;
    }
  }
  return pruned;
}

function safePath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

function headerOrNull(req: Request, key: string) {
  const value = req.headers.get(key);
  return value ?? undefined;
}

function deriveRequestId(req: Request) {
  const explicit = req.headers.get("x-request-id") ?? req.headers.get("cf-ray");
  if (explicit) return explicit;
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function writeLog(entry: LogEntry) {
  try {
    console.log(JSON.stringify(entry, replacer));
  } catch (err) {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        msg: "log_serialization_failed",
        original_message: entry.msg,
        error: serializeError(err),
      }),
    );
  }
}

function replacer(_key: string, value: unknown) {
  if (value instanceof Error) return serializeError(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") return undefined;
  if (value instanceof Request) {
    return { method: value.method, url: value.url };
  }
  if (value instanceof Response) {
    return { status: value.status };
  }
  return value;
}

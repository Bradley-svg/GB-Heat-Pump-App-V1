import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { formatDate } from "../../utils/format";
import type {
  CreateMqttMappingResponse,
  DeleteMqttMappingResponse,
  MqttMapping,
  MqttMappingsResponse,
  UpdateMqttMappingResponse,
} from "../../types/api";
import { ApiError } from "../../services/api-client";

const PAGE_LIMIT = 20;

type DirectionFilter = "all" | "ingress" | "egress";
type EnabledFilter = "all" | "enabled" | "disabled";

interface FilterState {
  topic: string;
  direction: DirectionFilter;
  enabled: EnabledFilter;
}

interface MappingFormValues {
  mapping_id: string;
  topic: string;
  profile_id: string;
  device_id: string;
  direction: "ingress" | "egress";
  qos: string;
  description: string;
  transform: string;
  enabled: boolean;
}

interface FormState {
  mode: "create" | "edit";
  values: MappingFormValues;
  original?: MqttMapping;
  saving: boolean;
  error: string | null;
}

const DEFAULT_FILTERS: FilterState = {
  topic: "",
  direction: "all",
  enabled: "all",
};

const DEFAULT_FORM_VALUES: MappingFormValues = {
  mapping_id: "",
  topic: "",
  profile_id: "",
  device_id: "",
  direction: "ingress",
  qos: "0",
  description: "",
  transform: "",
  enabled: true,
};

export default function MqttMappingsPage() {
  const api = useApiClient();
  const [mappings, setMappings] = useState<MqttMapping[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formState, setFormState] = useState<FormState>({
    mode: "create",
    values: DEFAULT_FORM_VALUES,
    saving: false,
    error: null,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryBase = useMemo(() => buildQueryString(filters), [filters]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setFetchError(null);
    api
      .get<MqttMappingsResponse>(`/api/mqtt/mappings${queryBase}`, { signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        setMappings(response.mappings);
        setNextCursor(response.next);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFetchError("Unable to load MQTT mappings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, queryBase]);

  const handleFilterChange = useCallback((field: keyof FilterState, value: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
  }, []);

  const appendMappings = useCallback((incoming: MqttMapping[]) => {
    setMappings((existing) => mergeMappings(existing, incoming));
  }, []);

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setFetchError(null);
    const path = `/api/mqtt/mappings${buildQueryString(filters, nextCursor)}`;
    api
      .get<MqttMappingsResponse>(path)
      .then((response) => {
        appendMappings(response.mappings);
        setNextCursor(response.next);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFetchError("Unable to load additional mappings");
      })
      .finally(() => setLoadingMore(false));
  }, [api, appendMappings, filters, nextCursor]);

  const startCreate = useCallback(() => {
    setFormState({
      mode: "create",
      values: DEFAULT_FORM_VALUES,
      saving: false,
      error: null,
    });
  }, []);

  const startEdit = useCallback((mapping: MqttMapping) => {
    setFormState({
      mode: "edit",
      original: mapping,
      values: toFormValues(mapping),
      saving: false,
      error: null,
    });
  }, []);

  const handleFormChange = useCallback((field: keyof MappingFormValues, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value,
      },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const { mode, values, original } = formState;
      const trimmedTopic = values.topic.trim();
      if (!trimmedTopic) {
        setFormState((prev) => ({ ...prev, error: "Topic is required." }));
        return;
      }

      const qosValue = clampQos(Number(values.qos));
      const profileId = normalizeString(values.profile_id);
      const deviceId = normalizeString(values.device_id);
      const description = normalizeString(values.description);
      let transform: Record<string, unknown> | null;

      try {
        transform = parseTransform(values.transform);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid transform JSON.";
        setFormState((prev) => ({ ...prev, error: message }));
        return;
      }

      setFormState((prev) => ({ ...prev, saving: true, error: null }));
      setBanner(null);

      if (mode === "create") {
        const payload: Record<string, unknown> = {
          topic: trimmedTopic,
          direction: values.direction,
          qos: qosValue,
          enabled: values.enabled,
        };
        if (values.mapping_id.trim()) payload.mapping_id = values.mapping_id.trim();
        if (profileId) payload.profile_id = profileId;
        if (deviceId) payload.device_id = deviceId;
        if (description) payload.description = description;
        if (transform) payload.transform = transform;

        try {
          const response = await api.post<CreateMqttMappingResponse>("/api/mqtt/mappings", payload);
          setMappings((prev) => upsertMapping(prev, response.mapping));
          setBanner({ type: "success", message: "Mapping created." });
          setFormState({
            mode: "create",
            values: DEFAULT_FORM_VALUES,
            saving: false,
            error: null,
          });
        } catch (err) {
          const message = extractApiMessage(err, "Unable to create mapping.");
          setFormState((prev) => ({ ...prev, error: message }));
        }
        return;
      }

      if (!original) {
        setFormState((prev) => ({ ...prev, saving: false, error: "No mapping selected." }));
        return;
      }

      const diff = buildUpdatePayload(values, original, {
        topic: trimmedTopic,
        profile_id: profileId,
        device_id: deviceId,
        description,
        direction: values.direction,
        qos: qosValue,
        transform,
        enabled: values.enabled,
      });

      if (!diff) {
        setFormState((prev) => ({ ...prev, saving: false, error: "No changes detected." }));
        return;
      }

      try {
        const response = await api.put<UpdateMqttMappingResponse>(
          `/api/mqtt/mappings/${original.mapping_id}`,
          diff,
        );
        setMappings((prev) => upsertMapping(prev, response.mapping));
        setBanner({ type: "success", message: "Mapping updated." });
        setFormState({
          mode: "edit",
          original: response.mapping,
          values: toFormValues(response.mapping),
          saving: false,
          error: null,
        });
      } catch (err) {
        const message = extractApiMessage(err, "Unable to update mapping.");
        setFormState((prev) => ({ ...prev, error: message }));
      }
    },
    [api, formState],
  );

  const handleDelete = useCallback(
    async (mapping: MqttMapping) => {
      const confirmed = window.confirm(`Delete mapping "${mapping.topic}"?`);
      if (!confirmed) return;
      setDeletingId(mapping.mapping_id);
      setBanner(null);
      try {
        await api.delete<DeleteMqttMappingResponse>(`/api/mqtt/mappings/${mapping.mapping_id}`);
        setMappings((prev) => prev.filter((row) => row.mapping_id !== mapping.mapping_id));
        setBanner({ type: "success", message: "Mapping deleted." });
        if (formState.mode === "edit" && formState.original?.mapping_id === mapping.mapping_id) {
          startCreate();
        }
      } catch (err) {
        const message = extractApiMessage(err, "Unable to delete mapping.");
        setBanner({ type: "error", message });
      } finally {
        setDeletingId(null);
      }
    },
    [api, formState.mode, formState.original, startCreate],
  );

  const activeFormTitle =
    formState.mode === "edit" && formState.original ?
      `Edit mapping ${formState.original.mapping_id}` :
      "Create mapping";

  return (
    <Page title="MQTT Mappings">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Filters</div>
        </div>
        <form
          className="filters-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ ...draftFilters });
          }}
        >
          <label className="field">
            <span>Topic contains</span>
            <input
              type="text"
              value={draftFilters.topic}
              onChange={(event) => handleFilterChange("topic", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Direction</span>
            <select
              value={draftFilters.direction}
              onChange={(event) => handleFilterChange("direction", event.target.value)}
            >
              <option value="all">All traffic</option>
              <option value="ingress">Ingress</option>
              <option value="egress">Egress</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={draftFilters.enabled}
              onChange={(event) => handleFilterChange("enabled", event.target.value)}
            >
              <option value="all">All mappings</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <div className="filter-actions">
            <button type="submit" className="btn secondary">
              Apply
            </button>
            <button type="button" className="btn link" onClick={handleResetFilters}>
              Reset
            </button>
          </div>
        </form>
        {fetchError ? <div className="callout error mt-06">{fetchError}</div> : null}
      </div>

      {banner ? (
        <div className={`card callout ${banner.type === "success" ? "success" : "error"}`}>
          {banner.message}
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Current mappings</div>
            <div className="subdued">
              {mappings.length} mapping{mappings.length === 1 ? "" : "s"} loaded
            </div>
          </div>
        </div>
        {loading && !mappings.length ? (
          <div>Loading mappings...</div>
        ) : mappings.length ? (
          <div className="min-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Profile</th>
                  <th>Device</th>
                  <th>Direction</th>
                  <th>QoS</th>
                  <th>Enabled</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.mapping_id}>
                    <td>{mapping.topic}</td>
                    <td>{mapping.profile_id ?? "-"}</td>
                    <td>{mapping.device_id ?? "-"}</td>
                    <td>{mapping.direction}</td>
                    <td>{mapping.qos}</td>
                    <td>{mapping.enabled ? "Yes" : "No"}</td>
                    <td>{formatDate(mapping.updated_at)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn link"
                        onClick={() => startEdit(mapping)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn link danger"
                        onClick={() => handleDelete(mapping)}
                        disabled={deletingId === mapping.mapping_id}
                      >
                        {deletingId === mapping.mapping_id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No mappings match the current filters.</div>
        )}
        {nextCursor ? (
          <div className="mt-06">
            <button className="btn secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">{activeFormTitle}</div>
          {formState.mode === "edit" ? (
            <button type="button" className="btn secondary" onClick={startCreate}>
              New mapping
            </button>
          ) : null}
        </div>
        {formState.error ? <div className="callout error">{formState.error}</div> : null}
        <form className="mapping-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>Mapping ID</span>
              <input
                type="text"
                value={formState.values.mapping_id}
                onChange={(event) => handleFormChange("mapping_id", event.target.value)}
                disabled={formState.mode === "edit"}
                placeholder={formState.mode === "create" ? "Optional" : undefined}
              />
            </label>
            <label className="field">
              <span>Topic</span>
              <input
                type="text"
                value={formState.values.topic}
                onChange={(event) => handleFormChange("topic", event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Profile ID</span>
              <input
                type="text"
                value={formState.values.profile_id}
                onChange={(event) => handleFormChange("profile_id", event.target.value)}
                placeholder="Optional"
              />
            </label>
            <label className="field">
              <span>Device ID</span>
              <input
                type="text"
                value={formState.values.device_id}
                onChange={(event) => handleFormChange("device_id", event.target.value)}
                placeholder="Optional"
              />
            </label>
            <label className="field">
              <span>Direction</span>
              <select
                value={formState.values.direction}
                onChange={(event) => handleFormChange("direction", event.target.value)}
              >
                <option value="ingress">Ingress</option>
                <option value="egress">Egress</option>
              </select>
            </label>
            <label className="field">
              <span>QoS</span>
              <select
                value={formState.values.qos}
                onChange={(event) => handleFormChange("qos", event.target.value)}
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>
            <label className="field">
              <span>Description</span>
              <input
                type="text"
                value={formState.values.description}
                onChange={(event) => handleFormChange("description", event.target.value)}
                placeholder="Optional"
              />
            </label>
            <label className="field checkbox">
              <input
                type="checkbox"
                checked={formState.values.enabled}
                onChange={(event) => handleFormChange("enabled", event.target.checked)}
              />
              <span>Enabled</span>
            </label>
            <label className="field span-2">
              <span>Transform JSON</span>
              <textarea
                value={formState.values.transform}
                onChange={(event) => handleFormChange("transform", event.target.value)}
                rows={4}
                placeholder='e.g. {"mode":"eco"}'
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn primary" type="submit" disabled={formState.saving}>
              {formState.saving ? "Saving..." : "Save mapping"}
            </button>
            {formState.mode === "edit" ? (
              <button type="button" className="btn" onClick={startCreate} disabled={formState.saving}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </Page>
  );
}

function buildQueryString(filters: FilterState, cursor?: string | null) {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_LIMIT));
  if (filters.topic.trim()) params.set("topic", filters.topic.trim());
  if (filters.direction !== "all") params.set("direction", filters.direction);
  if (filters.enabled === "enabled") params.set("enabled", "true");
  if (filters.enabled === "disabled") params.set("enabled", "false");
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function normalizeString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseTransform(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Transform must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Invalid transform JSON: ${err.message}`);
    }
    throw new Error("Invalid transform JSON.");
  }
}

function toFormValues(mapping: MqttMapping): MappingFormValues {
  return {
    mapping_id: mapping.mapping_id,
    topic: mapping.topic,
    profile_id: mapping.profile_id ?? "",
    device_id: mapping.device_id ?? "",
    direction: mapping.direction,
    qos: String(mapping.qos ?? 0),
    description: mapping.description ?? "",
    transform: mapping.transform ? JSON.stringify(mapping.transform, null, 2) : "",
    enabled: mapping.enabled,
  };
}

function upsertMapping(existing: MqttMapping[], mapping: MqttMapping): MqttMapping[] {
  const index = existing.findIndex((row) => row.mapping_id === mapping.mapping_id);
  if (index === -1) {
    return [mapping, ...existing];
  }
  const next = existing.slice();
  next[index] = mapping;
  return next;
}

function mergeMappings(existing: MqttMapping[], incoming: MqttMapping[]) {
  const known = new Map(existing.map((item) => [item.mapping_id, item]));
  incoming.forEach((item) => {
    known.set(item.mapping_id, item);
  });
  return Array.from(known.values()).sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
}

function clampQos(input: number) {
  if (!Number.isFinite(input)) return 0;
  if (input < 0) return 0;
  if (input > 2) return 2;
  return Math.round(input);
}

function buildUpdatePayload(
  values: MappingFormValues,
  original: MqttMapping,
  prepared: {
    topic: string;
    profile_id: string | null;
    device_id: string | null;
    description: string | null;
    direction: "ingress" | "egress";
    qos: number;
    transform: Record<string, unknown> | null;
    enabled: boolean;
  },
) {
  const diff: Record<string, unknown> = {};
  if (original.topic !== prepared.topic) diff.topic = prepared.topic;
  if ((original.profile_id ?? null) !== prepared.profile_id) diff.profile_id = prepared.profile_id;
  if ((original.device_id ?? null) !== prepared.device_id) diff.device_id = prepared.device_id;
  if ((original.description ?? null) !== prepared.description) diff.description = prepared.description;
  if (original.direction !== prepared.direction) diff.direction = prepared.direction;
  if (original.qos !== prepared.qos) diff.qos = prepared.qos;
  if (original.enabled !== prepared.enabled) diff.enabled = prepared.enabled;
  const originalTransform = JSON.stringify(original.transform ?? null);
  const nextTransform = JSON.stringify(prepared.transform ?? null);
  if (originalTransform !== nextTransform) diff.transform = prepared.transform;

  return Object.keys(diff).length ? diff : null;
}

function extractApiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.body as { error?: string } | null;
    if (body?.error) return body.error;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

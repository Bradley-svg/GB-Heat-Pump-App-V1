import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PropsWithChildren } from "react";

import { ApiClientContext } from "../../app/contexts";
import type { ApiClient, RequestOptions } from "../../services/api-client";
import { useDeviceRoster, useDeviceTelemetry } from "../../pages/device-detail/useDeviceData";
import type { TelemetryLatestBatchResponse, TelemetrySeriesResponse } from "../../types/api";
import { createApiClientMock } from "../testUtils";

function createWrapper(api: ApiClient) {
  return function ApiClientProvider({ children }: PropsWithChildren) {
    return <ApiClientContext.Provider value={api}>{children}</ApiClientContext.Provider>;
  };
}

describe("useDeviceRoster", () => {
  it("requests scoped devices when mine filter is enabled", async () => {
    const calls: [string, RequestOptions | undefined][] = [];
    const api = createApiClientMock({
      get: <T,>(path: string, options?: RequestOptions) => {
        calls.push([path, options]);
        return Promise.resolve({ items: [], next: null } as T);
      },
    });
    const wrapper = createWrapper(api);

    renderHook(() => useDeviceRoster(true), { wrapper });

    await waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]?.[0]).toContain("mine=1");
  });

  it("requests all devices when scope toggles off", async () => {
    const calls: [string, RequestOptions | undefined][] = [];
    const api = createApiClientMock({
      get: <T,>(path: string, options?: RequestOptions) => {
        calls.push([path, options]);
        return Promise.resolve({ items: [], next: null } as T);
      },
    });
    const wrapper = createWrapper(api);

    const { rerender } = renderHook(
      ({ scopeMine }) => useDeviceRoster(scopeMine),
      {
        initialProps: { scopeMine: true },
        wrapper,
      },
    );

    await waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]?.[0]).toContain("mine=1");

    rerender({ scopeMine: false });

    await waitFor(() => expect(calls.length).toBe(2));
    expect(calls[1]?.[0]).toContain("mine=0");
  });
});

describe("useDeviceTelemetry", () => {
  it("skips API calls when lookup is missing", async () => {
    const api = createApiClientMock({
      get: () => Promise.reject(new Error("GET should not be called when lookup is empty")),
      post: () => Promise.reject(new Error("POST should not be called when lookup is empty")),
    });
    const wrapper = createWrapper(api);

    const { result } = renderHook(() => useDeviceTelemetry(null), { wrapper });

    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.data).toEqual({ latest: null, series: null });
  });

  it("fetches telemetry batch and series for the provided lookup", async () => {
    const postCalls: [string, unknown, RequestOptions | undefined][] = [];
    const getCalls: [string, RequestOptions | undefined][] = [];

    const latestResponse: TelemetryLatestBatchResponse = {
      generated_at: "2025-01-01T00:00:00.000Z",
      items: [
        {
          lookup: "device-1",
          device_id: "device-1",
          profile_id: "profile-1",
          site: "HQ",
          online: true,
          last_seen_at: "2025-01-01T00:00:00.000Z",
          latest: {
            ts: 1,
            updated_at: "2025-01-01T00:00:00.000Z",
            online: true,
            supplyC: 45,
            returnC: 39,
            deltaT: 6,
            thermalKW: 4.2,
            cop: 3.5,
            faults: [],
            mode: "heating",
            defrost: 0,
            cop_quality: "measured",
          },
        },
      ],
      missing: [],
    };

    const seriesResponse: TelemetrySeriesResponse = {
      generated_at: "2025-01-01T00:00:00.000Z",
      scope: { type: "device", device_id: "device-1", lookup: "device-1" },
      interval_ms: 300_000,
      window: {
        start: "2025-01-01T00:00:00.000Z",
        end: "2025-01-01T01:00:00.000Z",
      },
      metrics: ["thermalKW", "cop"],
      series: [
        {
          bucket_start: "2025-01-01T00:00:00.000Z",
          sample_count: 2,
          values: {
            thermalKW: { avg: 4.2 },
            cop: { avg: 3.5 },
          },
        },
      ],
    };

    const api = createApiClientMock({
      post: <T,>(path: string, body: unknown, options?: RequestOptions) => {
        postCalls.push([path, body, options]);
        return Promise.resolve(latestResponse as T);
      },
      get: <T,>(path: string, options?: RequestOptions) => {
        getCalls.push([path, options]);
        return Promise.resolve(seriesResponse as T);
      },
    });
    const wrapper = createWrapper(api);

    const { result } = renderHook(() => useDeviceTelemetry("device-1"), { wrapper });

    await waitFor(() => expect(postCalls.length).toBe(1));
    expect(postCalls[0]?.[0]).toBe("/api/telemetry/latest-batch");
    expect(postCalls[0]?.[1]).toEqual({ devices: ["device-1"] });
    expect(getCalls[0]?.[0]).toContain("/api/telemetry/series?");

    await waitFor(() => expect(result.current.data?.latest?.device_id).toBe("device-1"));
    expect(result.current.data?.series).toEqual(seriesResponse);
  });
});

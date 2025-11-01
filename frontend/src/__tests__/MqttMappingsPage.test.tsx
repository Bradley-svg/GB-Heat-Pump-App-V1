import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import MqttMappingsPage from "../pages/admin/MqttMappingsPage";
import type { ApiClient } from "../services/api-client";
import type {
  CreateMqttMappingResponse,
  DeleteMqttMappingResponse,
  MqttMapping,
  MqttMappingsResponse,
  UpdateMqttMappingResponse,
} from "../types/api";
import {
  createApiClientMock,
  mockApiDelete,
  mockApiGet,
  mockApiPost,
  mockApiPut,
  renderWithApi,
} from "./testUtils";

describe("MqttMappingsPage", () => {
  const originalConfirm = window.confirm;

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it("loads mappings and performs create, update, and delete actions", async () => {
    const initialMappings: MqttMapping[] = [
      {
        mapping_id: "mqtt-0001",
        topic: "greenbro/dev-1001/telemetry",
        profile_id: "profile-west",
        device_id: "dev-1001",
        lookup: "token-1001",
        site: "Cape Town Plant",
        direction: "egress",
        qos: 1,
        transform: { type: "passthrough" },
        description: "Telemetry stream",
        enabled: true,
        created_at: "2025-01-01T12:00:00.000Z",
        updated_at: "2025-01-02T12:00:00.000Z",
      },
    ];

    const createdMapping: MqttMapping = {
      mapping_id: "mqtt-9999",
      topic: "greenbro/dev-1001/commands/test",
      profile_id: "profile-west",
      device_id: "dev-1001",
      lookup: "token-1001",
      site: "Cape Town Plant",
      direction: "ingress",
      qos: 0,
      transform: { mode: "eco" },
      description: "Integration mapping",
      enabled: true,
      created_at: "2025-01-05T09:00:00.000Z",
      updated_at: "2025-01-05T09:00:00.000Z",
    };

    const updatedMapping: MqttMapping = {
      ...createdMapping,
      description: "Updated integration mapping",
      enabled: false,
      updated_at: "2025-01-05T10:00:00.000Z",
    };

    const listResponse: MqttMappingsResponse = {
      generated_at: "2025-01-05T08:00:00.000Z",
      mappings: initialMappings,
      next: null,
    };

    const getMock = vi.fn<ApiClient["get"]>().mockResolvedValueOnce(listResponse);
    const postMock = vi.fn<ApiClient["post"]>().mockResolvedValueOnce({
      ok: true,
      mapping: createdMapping,
    } satisfies CreateMqttMappingResponse);
    const putMock = vi.fn<ApiClient["put"]>().mockResolvedValueOnce({
      ok: true,
      mapping: updatedMapping,
    } satisfies UpdateMqttMappingResponse);
    const deleteMock = vi.fn<ApiClient["delete"]>().mockResolvedValueOnce({
      ok: true,
      mapping: updatedMapping,
    } satisfies DeleteMqttMappingResponse);

    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
      post: mockApiPost(postMock),
      put: mockApiPut(putMock),
      delete: mockApiDelete(deleteMock),
    });

    renderWithApi(<MqttMappingsPage />, apiClient, "/app/admin/mqtt");

    const table = await screen.findByRole("table");
    const initialRows = within(table).getAllByRole("row");
    expect(initialRows).toHaveLength(2); // header + data
    expect(within(initialRows[1]).getByText("greenbro/dev-1001/telemetry")).toBeInTheDocument();

    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Mapping ID"), "mqtt-9999");
    await user.clear(screen.getByLabelText("Topic"));
    await user.type(screen.getByLabelText("Topic"), "greenbro/dev-1001/commands/test");
    await user.type(screen.getByLabelText("Profile ID"), "profile-west");
    await user.type(screen.getByLabelText("Device ID"), "dev-1001");
    await user.type(screen.getByLabelText("Description"), "Integration mapping");
    const transformField = screen.getByLabelText("Transform JSON");
    fireEvent.change(transformField, { target: { value: '{"mode":"eco"}' } });

    await user.click(screen.getByRole("button", { name: "Save mapping" }));

    const createCall = postMock.mock.calls[0] as [string, Record<string, unknown>, unknown?];
    expect(createCall[0]).toBe("/api/mqtt/mappings");
    expect(createCall[1]).toEqual({
      mapping_id: "mqtt-9999",
      topic: "greenbro/dev-1001/commands/test",
      profile_id: "profile-west",
      device_id: "dev-1001",
      direction: "ingress",
      qos: 0,
      enabled: true,
      description: "Integration mapping",
      transform: { mode: "eco" },
    });
    expect(await screen.findByText("Mapping created.")).toBeInTheDocument();

    const rowsAfterCreate = within(await screen.findByRole("table")).getAllByRole("row");
    const newRow = rowsAfterCreate.find((row) =>
      within(row).queryByText("greenbro/dev-1001/commands/test"),
    );
    expect(newRow).toBeDefined();

    await user.click(within(newRow!).getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "Updated integration mapping");
    await user.click(screen.getByLabelText("Enabled"));

    await user.click(screen.getByRole("button", { name: "Save mapping" }));

    const updateCall = putMock.mock.calls[0] as [string, Record<string, unknown>, unknown?];
    expect(updateCall[0]).toBe("/api/mqtt/mappings/mqtt-9999");
    expect(updateCall[1]).toEqual({
      description: "Updated integration mapping",
      enabled: false,
    });
    expect(await screen.findByText("Mapping updated.")).toBeInTheDocument();

    window.confirm = vi.fn().mockReturnValue(true);
    await user.click(within(newRow!).getByRole("button", { name: "Delete" }));
    const deleteCall = deleteMock.mock.calls[0] as [string, unknown?];
    expect(deleteCall[0]).toBe("/api/mqtt/mappings/mqtt-9999");
    expect(await screen.findByText("Mapping deleted.")).toBeInTheDocument();
    expect(screen.queryByText("Updated integration mapping")).not.toBeInTheDocument();
  });
});


import { describe, expect, it } from "vitest";

import { mapRegistersToTelemetry, mapTelemetryToRegisters } from "./mapper";

describe("mapRegistersToTelemetry", () => {
  it("converts default layout", () => {
    const registers = [
      463, // 46.3 C
      428, // 42.8
      511, // 51.1
      182, // 18.2
      41, // 0.41 L/s (scale 0.01)
      87, // 8.7 A
      328, // eev steps
      29, // 2.9 kW
      1, // AUTO control mode
      5, // defrost %
      0b1001, // faults bitset
      0xffc7 // RSSI -57 dBm
    ];

    const result = mapRegistersToTelemetry(registers, {
      faultBits: {
        index: 10,
        map: {
          0: "LP01",
          3: "HP02"
        }
      },
      rssi: { index: 11, signed: true },
      modeMap: {
        1: "AUTO"
      }
    });

    expect(result.metrics).toMatchObject({
      supplyC: 46.3,
      returnC: 42.8,
      tankC: 51.1,
      ambientC: 18.2,
      flowLps: 0.41,
      compCurrentA: 8.7,
      eevSteps: 328,
      powerKW: 2.9,
      control_mode: "AUTO",
      defrost: 0.05
    });
    expect(result.faults).toEqual(["LP01", "HP02"]);
    expect(result.rssi).toBe(-57);
  });

  it("handles custom register layout", () => {
    const registers = {
      20: 1000,
      21: 500
    };
    const result = mapRegistersToTelemetry(registers, {
      layout: {
        supplyC: { index: 20, scale: 0.01, signed: true, precision: 2 },
        powerKW: { index: 21, scale: 0.001, signed: false, precision: 3 }
      }
    });
    expect(result.metrics.supplyC).toBe(10);
    expect(result.metrics.powerKW).toBe(0.5);
  });
});

describe("mapTelemetryToRegisters", () => {
  it("calculates writable register updates", () => {
    const writes = mapTelemetryToRegisters({
      supplyC: 42.5,
      powerKW: 3.2,
      control_mode: "MANUAL"
    });

    expect(writes).toEqual(
      expect.arrayContaining([
        { address: 0, value: 425 },
        { address: 7, value: 32 },
        { address: 8, value: 2 } // MANUAL per default map
      ])
    );
  });
});

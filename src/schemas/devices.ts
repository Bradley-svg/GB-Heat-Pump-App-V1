import { z } from "zod";
import { numericParam, optionalBooleanFlag, optionalTrimmedString } from "./params";

export const ListDevicesQuerySchema = z
  .object({
    mine: optionalBooleanFlag,
    limit: numericParam({ integer: true, min: 1, max: 100, defaultValue: 50 }),
    cursor: optionalTrimmedString,
  })
  .strict();

export type ListDevicesQuery = z.infer<typeof ListDevicesQuerySchema>;

export const DeviceHistoryQuerySchema = z
  .object({
    limit: numericParam({ integer: true, min: 1, max: 500, defaultValue: 72 }),
  })
  .strict();

export type DeviceHistoryQuery = z.infer<typeof DeviceHistoryQuerySchema>;

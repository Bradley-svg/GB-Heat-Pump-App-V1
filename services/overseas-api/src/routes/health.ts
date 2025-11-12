import { json } from "../utils/responses";
import { nowISO } from "../utils";

export async function handleHealth() {
  return json({ ok: true, ts: nowISO() });
}

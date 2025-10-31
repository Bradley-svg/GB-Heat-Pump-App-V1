import { json } from "../lib/http";
import { nowISO } from "../lib/utils";

export async function handleHealth() {
  return json({ ok: true, ts: nowISO() });
}

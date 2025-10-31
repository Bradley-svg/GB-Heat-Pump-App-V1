import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { json } from "../utils/responses";

export async function handleMe(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json(user);
}

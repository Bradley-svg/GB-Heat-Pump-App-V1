import { hashPassword, serializePasswordHash } from "../src/lib/auth/password.ts";

async function main() {
  const password = process.env.PASSWORD ?? "StrongPass!2025";
  const iterations = Number(process.env.PBKDF2_ITERATIONS ?? 120_000);
  const record = await hashPassword(password, { iterations });
  const serialized = serializePasswordHash(record);
  console.log(JSON.stringify(serialized, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

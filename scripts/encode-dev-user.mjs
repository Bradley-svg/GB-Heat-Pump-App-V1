#!/usr/bin/env node
import { Buffer } from "node:buffer";
import { parseArgs } from "node:util";

const {
  values: { email, role, client },
} = parseArgs({
  options: {
    email: { type: "string" },
    role: { type: "string", multiple: true },
    client: { type: "string", multiple: true },
  },
});

const payload = {
  email: email ?? "local-admin@example.com",
  roles: role && role.length ? role : ["admin"],
  clientIds: client && client.length ? client : ["profile-west"],
};

const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
process.stdout.write(`base64:${encoded}`);

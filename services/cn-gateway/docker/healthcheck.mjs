import http from "node:http";

const port = Number(process.env.PORT ?? 8080);

const req = http.request(
  {
    hostname: "127.0.0.1",
    port,
    method: "GET",
    path: "/health",
    timeout: 4000
  },
  (res) => {
    if (res.statusCode !== 200) {
      process.exit(1);
    }
    res.resume();
    res.on("end", () => process.exit(0));
  }
);

req.on("error", () => process.exit(1));
req.end();

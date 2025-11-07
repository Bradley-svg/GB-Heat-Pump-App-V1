import { init, cleanup } from "detox";

beforeAll(async () => {
  await init();
}, 120000);

afterAll(async () => {
  await cleanup();
});

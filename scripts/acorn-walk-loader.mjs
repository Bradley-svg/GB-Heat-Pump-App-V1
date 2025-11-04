import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const acornWalkUrl = pathToFileURL(resolvePath("vendor/acorn-walk/index.js")).href;

export async function resolve(specifier, context, defaultResolve) {
  if (specifier === "acorn-walk") {
    return { url: acornWalkUrl, shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}

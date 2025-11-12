import { Project } from "ts-morph";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const project = new Project({
  skipAddingFilesFromTsConfig: true,
  compilerOptions: {
    allowJs: true
  }
});

const patterns = [
  "apps/**/*.ts",
  "apps/**/*.tsx",
  "packages/**/*.ts",
  "packages/**/*.tsx",
  "services/**/*.ts",
  "services/**/*.tsx"
].map((pattern) => path.join(repoRoot, pattern));

patterns.forEach((pattern) => {
  project.addSourceFilesAtPaths(pattern);
});

const updatedFiles = new Set<string>();

for (const sourceFile of project.getSourceFiles()) {
  let fileUpdated = false;
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifierValue = importDecl.getModuleSpecifierValue();
    const nextValue = rewriteSpecifier(specifierValue);
    if (nextValue && nextValue !== specifierValue) {
      importDecl.setModuleSpecifier(nextValue);
      fileUpdated = true;
    }
  }
  if (fileUpdated) {
    updatedFiles.add(path.relative(repoRoot, sourceFile.getFilePath()));
  }
}

if (updatedFiles.size > 0) {
  project.saveSync();
  console.log(`[fix-imports] Updated ${updatedFiles.size} files`);
  for (const file of Array.from(updatedFiles).sort()) {
    console.log(` - ${file}`);
  }
} else {
  console.log("[fix-imports] No import specifiers required updates");
}

function rewriteSpecifier(value: string): string | null {
  if (
    !value ||
    value.startsWith(".") ||
    value.startsWith("/") ||
    value.includes("services/overseas-api/src/frontend")
  ) {
    return null;
  }

  if (value.startsWith("frontend/")) {
    return value.replace(/^frontend\//, "apps/dashboard-web/");
  }

  if (value === "frontend") {
    return "apps/dashboard-web";
  }

  return null;
}

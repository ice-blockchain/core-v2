const fs = require("fs");
const path = require("path");
const { transform } = require("@svgr/core");

const ASSETS_DIR = path.resolve(__dirname, "../src/icons/assets");
const GENERATED_DIR = path.resolve(__dirname, "../src/icons/generated");
const ICONS_DIR = path.resolve(__dirname, "../src/icons");

const HEADER = "// AUTO-GENERATED — do not edit manually. Run `pnpm generate:icons`.\n";

function stripPrefix(filename) {
  return filename.replace(/\.svg$/, "").replace(/^icon_/, "");
}

function toComponentName(filename) {
  const name = stripPrefix(filename)
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `${name}Icon`;
}

function toRegistryKey(filename) {
  return stripPrefix(filename);
}

function extractViewBox(svgCode) {
  const vbMatch = svgCode.match(/viewBox="([^"]+)"/);
  if (vbMatch) return vbMatch[1];
  const wMatch = svgCode.match(/width="([\d.]+)"/);
  const hMatch = svgCode.match(/height="([\d.]+)"/);
  if (wMatch && hMatch) return `0 0 ${wMatch[1]} ${hMatch[1]}`;
  return "0 0 24 24";
}

async function generateComponent(svgFile) {
  const svgCode = fs.readFileSync(path.join(ASSETS_DIR, svgFile), "utf-8");
  const componentName = toComponentName(svgFile);
  const viewBox = extractViewBox(svgCode);

  const config = require(path.resolve(__dirname, "../svgr.config.js"));
  const jsxCode = await transform(svgCode, config, { componentName });

  const patchedCode = patchGeneratedCode(jsxCode, componentName, viewBox);
  const outputPath = path.join(GENERATED_DIR, `${componentName}.tsx`);
  fs.writeFileSync(outputPath, `${HEADER}\n${patchedCode}`);

  return { componentName, registryKey: toRegistryKey(svgFile) };
}

function patchGeneratedCode(code, componentName, viewBox) {
  let patched = code;

  // Replace the default SVGR props interface with our own
  patched = patched.replace(
    /import type \{.*?\} from "react-native-svg";\n/s,
    "",
  );
  patched = patched.replace(/interface \w+Props \{[^}]*\}\n*/s, "");
  patched = patched.replace(
    /type Props = \{[^}]*\};\n*/s,
    "",
  );

  // Replace the function signature to use our props
  patched = patched.replace(
    /(?:const|function)\s+\w+\s*=?\s*\((?:props|\{[^}]*\})(?::\s*\w+)?\)\s*(?:=>)?\s*\{?\s*(?:return\s*)?/,
    `function ${componentName}({ size = 24, color }: ${componentName}Props) {\n  return `,
  );

  // Remove trailing default export
  patched = patched.replace(/\nexport default \w+;\n?$/, "\n");

  // Ensure we have our interface and correct imports
  const hasPathImport = patched.includes("<Path");
  const hasCircleImport = patched.includes("<Circle");
  const hasRectImport = patched.includes("<Rect");
  const hasGImport = patched.includes("<G");
  const hasMaskImport = patched.includes("<Mask");

  const svgImports = ["Svg", "Path"]
    .concat(hasCircleImport ? ["Circle"] : [])
    .concat(hasRectImport ? ["Rect"] : [])
    .concat(hasGImport ? ["G"] : [])
    .concat(hasMaskImport ? ["Mask"] : []);

  const importLine = `import Svg, { ${svgImports.filter((s) => s !== "Svg").join(", ")} } from "react-native-svg";`;

  const interfaceBlock = [
    "",
    `interface ${componentName}Props {`,
    "  size?: number;",
    "  color: string;",
    "}",
    "",
  ].join("\n");

  // Remove leftover {...props} spread and xmlns attribute
  patched = patched.replace(/\s*\{\.\.\.props\}/g, "");
  patched = patched.replace(/\s*xmlns="[^"]*"/g, "");

  // Replace width/height with size prop on the root Svg element only
  patched = patched.replace(/(<Svg\s[^>]*)width=\{[\d.]+\}/, "$1width={size}");
  patched = patched.replace(/(<Svg\s[^>]*)height=\{[\d.]+\}/, "$1height={size}");

  // Add viewBox so SVG paths scale properly at any rendered size
  if (!patched.includes("viewBox")) {
    patched = patched.replace(/<Svg /, `<Svg viewBox="${viewBox}" `);
  }

  // Clean up the top of the file and rebuild
  patched = patched.replace(/^import.*;\n*/gm, "");
  patched = patched.trim();

  // Ensure the function has a closing brace
  if (!patched.endsWith("}")) {
    patched = `${patched}\n}`;
  }

  patched = `${importLine}\n${interfaceBlock}\nexport ${patched}\n`;

  return patched;
}

function generateRegistry(icons) {
  const imports = icons
    .map(({ componentName }) =>
      `import { ${componentName} } from "./generated/${componentName}";`,
    )
    .join("\n");

  const entries = icons
    .map(({ registryKey, componentName }) => `  "${registryKey}": ${componentName},`)
    .join("\n");

  return [
    HEADER,
    `import type { ComponentType } from "react";`,
    "",
    imports,
    "",
    "interface IconComponentProps {",
    "  size?: number;",
    "  color: string;",
    "}",
    "",
    "export const iconRegistry: Record<string, ComponentType<IconComponentProps>> = {",
    entries,
    "};",
    "",
  ].join("\n");
}

function generateTypes(icons) {
  const names = icons.map(({ registryKey }) => `"${registryKey}"`).join(" | ");
  return [HEADER, `export type IconName = ${names};`, ""].join("\n");
}

async function main() {
  const svgFiles = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => f.endsWith(".svg"))
    .sort();

  if (svgFiles.length === 0) {
    console.log("No SVG files found in", ASSETS_DIR);
    return;
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const icons = [];
  for (const svgFile of svgFiles) {
    const icon = await generateComponent(svgFile);
    icons.push(icon);
    console.log(`  Generated ${icon.componentName} from ${svgFile}`);
  }

  fs.writeFileSync(path.join(ICONS_DIR, "icon-registry.ts"), generateRegistry(icons));
  console.log("  Generated icon-registry.ts");

  fs.writeFileSync(path.join(ICONS_DIR, "icon-types.ts"), generateTypes(icons));
  console.log("  Generated icon-types.ts");

  console.log(`\nDone! ${icons.length} icon(s) generated.`);
}

main().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exit(1);
});

// CLI: node scripts/ocr-file.mjs <image-path> [lang]
import fs from "fs";
import path from "path";
import { extractText, terminateOcr } from "../src/services/ocr.service.js";
import { parse } from "../src/services/prescription.parser.js";

const file = process.argv[2];
const lang = process.argv[3];

if (!file) {
  console.error("usage: node scripts/ocr-file.mjs <image-path> [lang]");
  process.exit(2);
}

const resolved = path.resolve(process.cwd(), file);
if (!fs.existsSync(resolved)) {
  console.error(`file not found: ${resolved}`);
  process.exit(2);
}

const buffer = fs.readFileSync(resolved);
console.log(`file: ${resolved} (${buffer.length} bytes)`);

const { text, confidence, lang: usedLang } = await extractText(buffer, lang ? { lang } : {});
console.log(`lang=${usedLang} ocrConfidence=${confidence}`);
console.log("----- RAW OCR TEXT -----");
console.log(text || "(no text detected)");
console.log("----- PARSED ITEMS -----");
const { items, warnings } = parse(text, { confidence });
console.log(JSON.stringify(items, null, 2));
if (warnings.length) {
  console.log("----- WARNINGS -----");
  for (const w of warnings) console.log("- " + w);
}

await terminateOcr();

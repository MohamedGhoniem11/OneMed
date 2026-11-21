// Smoke test for the OCR prescription-extraction pipeline (no Firebase needed).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractText, terminateOcr } from "../src/services/ocr.service.js";
import { parse } from "../src/services/prescription.parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(__dirname, "./fixtures/prescription-sample.png");

const EXPECTED = ["Amoxicillin", "Paracetamol", "Omeprazole", "Cetirizine"];

const buffer = fs.readFileSync(fixture);
const { text, confidence, lang } = await extractText(buffer);
const { items, warnings } = parse(text, { confidence });

console.log(`lang=${lang} ocrConfidence=${confidence}`);
console.log("rawText:\n" + text);
console.log("items:", JSON.stringify(items, null, 2));
console.log("warnings:", warnings);

const failures = [];
if (items.length !== EXPECTED.length) {
  failures.push(`expected ${EXPECTED.length} items, got ${items.length}`);
}
for (const name of EXPECTED) {
  const found = items.find((i) => i.name.toLowerCase().includes(name.toLowerCase()));
  if (!found) failures.push(`missing expected medicine: ${name}`);
  else if (!found.dose || !found.duration) failures.push(`${name}: dose/duration not extracted`);
}

await terminateOcr();

if (failures.length) {
  console.error("\nFAIL:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("\nPASS: OCR + parser extracted all expected medicines.");

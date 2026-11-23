import { describe, expect, it } from "vitest";
import { parse, parseLine } from "../../src/services/prescription.parser.js";

const SAMPLE = [
  "Dr. Sarah Jenkins",
  "Patient: Mona Ali          Date: 2026-01-10",
  "Rx",
  "1. Amoxicillin 500mg 1-0-1 (BID) 5 Days",
  "2. Paracetamol 500 mg twice daily for 3 days",
  "3. Omeprazole 20mg once daily",
  "4. Cetirizine 10mg once daily 5 days",
  "Signature: ______",
].join("\n");

describe("prescription parser", () => {
  it("extracts medicines with dose, frequency, and duration", () => {
    const { items, warnings } = parse(SAMPLE, { confidence: 95 });
    expect(items).toHaveLength(4);
    expect(items.map((item) => item.name)).toEqual([
      "Amoxicillin",
      "Paracetamol",
      "Omeprazole",
      "Cetirizine",
    ]);
    expect(items[0]).toMatchObject({ dose: "500mg", duration: "5 Days", needsReview: false });
    expect(items[1].frequency).toMatch(/twice daily/i);
    expect(warnings).toEqual([]);
  });

  it("skips headers and lines without a medicine name", () => {
    const { items } = parse("Clinic\nDate: 2026-01-10\n12345\n");
    expect(items).toEqual([]);
  });

  it("flags lines without posology for manual review", () => {
    const item = parseLine("Ibuprofen");
    expect(item).toMatchObject({ name: "Ibuprofen", needsReview: true });
  });

  it("parses Arabic frequency and duration tokens", () => {
    const item = parseLine("أوميبرازول 20 مجم مرة يومياً لمدة 5");
    expect(item?.name).toContain("أوميبرازول");
    expect(item?.frequency).toContain("مرة");
    expect(item?.duration).toContain("لمدة");
  });

  it("warns on low OCR confidence", () => {
    const { warnings } = parse(SAMPLE, { confidence: 42 });
    expect(warnings.some((warning) => /Low OCR confidence \(42%\)/.test(warning))).toBe(true);
  });
});

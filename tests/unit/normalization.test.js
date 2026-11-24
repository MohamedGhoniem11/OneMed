import { describe, expect, it } from "vitest";
import {
  normalizeCsv, normalizeDicom, normalizeJson, normalizeOcrText, normalizeType, parseRange, toNumber,
} from "../../src/services/normalization.service.js";
import { extractPdfText } from "../../src/services/pdf.service.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("medical data normalization", () => {
  it("normalizes types and localized numbers", () => {
    expect(normalizeType("Vitals")).toBe("vital");
    expect(normalizeType("radiology")).toBe("imaging");
    expect(toNumber("١٤٫٢")).toBe(14.2);
    expect(parseRange("70 - 99")).toEqual({ referenceLow: 70, referenceHigh: 99 });
    expect(parseRange("< 200")).toEqual({ referenceLow: 0, referenceHigh: 200 });
  });

  it("parses CSV lab rows with reference ranges and abnormal flags", () => {
    const csv = "test,value,unit,range\nHemoglobin,14.2,g/dL,13.8-17.2\nGlucose,115,mg/dL,70-99";
    const result = normalizeCsv(csv);
    expect(result.sourceFormat).toBe("csv");
    expect(result.data.values).toHaveLength(2);
    expect(result.data.values[0]).toMatchObject({ name: "Hemoglobin", value: 14.2, unit: "g/dL", flag: "normal" });
    expect(result.data.values[1].flag).toBe("high");
    expect(result.status).toBe("abnormal");
  });

  it("parses FHIR Observation bundles", () => {
    const bundle = {
      resourceType: "Bundle",
      entry: [
        { resource: { resourceType: "DiagnosticReport", code: { text: "Metabolic panel" }, effectiveDateTime: "2026-02-10T09:00:00Z" } },
        { resource: { resourceType: "Observation", code: { text: "HbA1c" }, valueQuantity: { value: 7.2, unit: "%" }, referenceRange: [{ low: { value: 4 }, high: { value: 5.6 } }] } },
      ],
    };
    const result = normalizeJson(bundle);
    expect(result.sourceFormat).toBe("fhir");
    expect(result.title).toBe("Metabolic panel");
    expect(result.data.values[0]).toMatchObject({ name: "HbA1c", value: 7.2, flag: "high" });
  });

  it("flags low-confidence OCR extractions for manual review", () => {
    const result = normalizeOcrText("Hemoglobin 14.2 g/dL 13.8-17.2\nGlucose 115 mg/dL 70-99", { confidence: 64 });
    expect(result.needsReview).toBe(true);
    expect(result.status).toBe("needs_review");
    expect(result.data.values).toHaveLength(2);
  });

  it("extracts text from a digital PDF", async () => {
    const buffer = fs.readFileSync(path.join(here, "..", "fixtures", "lab-report.pdf"));
    const { text, pages } = await extractPdfText(buffer);
    expect(pages).toBeGreaterThan(0);
    expect(text).toContain("Hemoglobin");
    const result = normalizeOcrText(text, { confidence: 100, sourceFormat: "pdf" });
    expect(result.data.values.some((v) => v.name === "Hemoglobin")).toBe(true);
  });

  it("reads DICOM study metadata from an explicit-VR preamble", () => {
    const tags = [
      { group: 0x0008, element: 0x0060, vr: "CS", value: "CT" },
      { group: 0x0008, element: 0x0020, vr: "DA", value: "20260210" },
      { group: 0x0008, element: 0x1030, vr: "LO", value: "Chest CT" },
    ];
    const chunks = tags.map(({ group, element, vr, value }) => {
      const padded = value.length % 2 ? `${value} ` : value;
      const buf = Buffer.alloc(8 + padded.length);
      buf.writeUInt16LE(group, 0); buf.writeUInt16LE(element, 2);
      buf.write(vr, 4, 2, "ascii"); buf.writeUInt16LE(padded.length, 6);
      buf.write(padded, 8, "ascii");
      return buf;
    });
    const dicom = Buffer.concat([Buffer.alloc(128), Buffer.from("DICM"), ...chunks]);
    const result = normalizeDicom(dicom);
    expect(result.type).toBe("imaging");
    expect(result.data.dicom.modality).toBe("CT");
    expect(result.observedAt).toContain("2026-02-10");
  });
});

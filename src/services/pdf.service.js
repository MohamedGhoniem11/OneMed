import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { httpError } from "../utils/http-error.js";

/**
 * Text extraction from digital PDFs using PDF.js (local WASM, no cloud call).
 * Scanned PDFs have no text layer; those are stored as artifacts and flagged for
 * manual review rather than pretending OCR succeeded.
 */
export async function extractPdfText(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
    throw httpError(400, "Not a valid PDF file");
  }
  let doc;
  try {
    doc = await getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    }).promise;
    const pages = [];
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
      const page = await doc.getPage(pageNo);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).filter(Boolean).join(" "));
    }
    return { text: pages.join("\n").trim(), pages: doc.numPages };
  } catch (error) {
    if (error?.status) throw error;
    throw httpError(400, `Could not read PDF: ${error.message}`);
  } finally {
    // PDF.js 6 exposes cleanup(); older builds expose destroy().
    const release = doc && (typeof doc.cleanup === "function" ? doc.cleanup : doc.destroy);
    if (release) await release.call(doc).catch(() => {});
  }
}

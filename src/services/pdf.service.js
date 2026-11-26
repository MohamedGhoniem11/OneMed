import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import canvasLib from "@napi-rs/canvas";
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

/** Rasterize PDF pages to PNG for OCR of scanned documents. */
export async function rasterizePdf(buffer, { maxPages = 10 } = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
    throw httpError(400, "Not a valid PDF file");
  }
  let doc;
  try {
    doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true, isEvalSupported: false }).promise;
    const images = [];
    for (let pageNo = 1; pageNo <= Math.min(doc.numPages, maxPages); pageNo += 1) {
      const page = await doc.getPage(pageNo);
      const operators = await page.getOperatorList();
      for (let i = 0; i < operators.fnArray.length; i += 1) {
        const name = operators.argsArray[i]?.[0];
        if (typeof name !== "string") continue;
        const img = await page.objs.get(name);
        if (!img?.data || !img.width || !img.height) continue;
        if (img.data[0] === 0xff && img.data[1] === 0xd8) { images.push(Buffer.from(img.data)); continue; }
        const rgba = new Uint8ClampedArray(img.width * img.height * 4);
        const source = img.data;
        if (source.length === rgba.length) rgba.set(source);
        else for (let p = 0, q = 0; p < rgba.length; p += 4, q += 3) {
          rgba[p] = source[q]; rgba[p + 1] = source[q + 1]; rgba[p + 2] = source[q + 2]; rgba[p + 3] = 255;
        }
        const canvas = canvasLib.createCanvas(img.width, img.height);
        canvas.getContext("2d").putImageData(new canvasLib.ImageData(rgba, img.width, img.height), 0, 0);
        images.push(canvas.toBuffer("image/png"));
      }
    }
    return images;
  } catch (error) {
    if (error?.status) throw error;
    throw httpError(400, `Could not rasterize PDF: ${error.message}`);
  } finally {
    const release = doc && (typeof doc.cleanup === "function" ? doc.cleanup : doc.destroy);
    if (release) await release.call(doc).catch(() => {});
  }
}

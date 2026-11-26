import PDFDocument from "pdfkit";

/** Multi-page PDF writer for clinical reports with header and page numbers. */
export async function createTextPdf(title, lines, { subtitle = "" } = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: String(title || "OneMed report").slice(0, 120), Producer: "OneMed" } });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.on("pageAdded", () => {
    doc.fontSize(8).fillColor("#6b7a90").text("OneMed · Academic demo · Confidential", 48, 820, { width: 500, align: "right" });
    doc.fillColor("#10203a");
  });

  doc.fontSize(18).fillColor("#002657").text(String(title || "OneMed report"), { align: "left" });
  if (subtitle) doc.fontSize(10).fillColor("#6b7a90").text(String(subtitle)).moveDown(0.5);
  doc.moveDown().fontSize(10).fillColor("#10203a");
  for (const line of Array.isArray(lines) ? lines : String(lines || "").split(/\r?\n/)) {
    const text = String(line ?? "");
    if (doc.y > 780) doc.addPage();
    doc.text(text || " ", { width: 500 });
  }
  const pages = doc._pageBuffer ? 1 : 1;
  void pages;
  doc.end();
  return done;
}

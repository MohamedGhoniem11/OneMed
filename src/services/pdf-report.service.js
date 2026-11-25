/** Minimal PDF writer for text reports. No external dependency; Helvetica/ASCII. */
function ascii(text) {
  return String(text ?? "")
    .replace(/[^\x20-\x7E]/g, "?")
    .slice(0, 200);
}

function escapePdf(text) {
  return ascii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function createTextPdf(title, lines, { maxLines = 55 } = {}) {
  const rows = [String(title || "OneMed report"), ""]
    .concat(Array.isArray(lines) ? lines : String(lines || "").split(/\r?\n/))
    .slice(0, maxLines);
  const commands = rows.map((line, index) => {
    const y = 800 - index * 14;
    return `BT /F1 10 Tf 48 ${y} Td (${escapePdf(line)}) Tj ET`;
  }).join("\n");
  const stream = commands;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export const EG_PHONE = /^01[0125][0-9]{8}$/;
export const EG_NATIONAL_ID = /^[23][0-9]{13}$/;

// Removes whitespace/hyphens and normalizes +20 to 0.
export const normalizePhone = (phone) =>
  String(phone)
    .replace(/[\s-]/g, "")
    .replace(/^\+20/, "0");

export const isValidPhone = (phone) => EG_PHONE.test(normalizePhone(phone));

/** 14-digit Egyptian national ID (century digit 2/3) with a real embedded date. */
export function isValidNationalId(value) {
  const id = String(value ?? "").trim();
  if (!EG_NATIONAL_ID.test(id)) return false;
  const century = id[0] === "2" ? 1900 : 2000;
  const year = century + Number(id.slice(1, 3));
  const month = Number(id.slice(3, 5));
  const day = Number(id.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

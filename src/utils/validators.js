export const EG_PHONE = /^01[0125][0-9]{8}$/;

// Removes whitespace/hyphens and normalizes +20 to 0.
export const normalizePhone = (phone) =>
  String(phone)
    .replace(/[\s-]/g, "")
    .replace(/^\+20/, "0");

export const isValidPhone = (phone) => EG_PHONE.test(normalizePhone(phone));

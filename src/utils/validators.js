const EG_PHONE = /^01[0125][0-9]{8}$/;

// يشيل المسافات والشرطات ويحوّل +20 لـ 0
export const normalizePhone = (p) =>
  String(p).replace(/[\s-]/g, "").replace(/^\+20/, "0");

export const isValidPhone = (p) => EG_PHONE.test(normalizePhone(p));
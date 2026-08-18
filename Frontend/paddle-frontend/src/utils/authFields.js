/** Letters, spaces, and common name punctuation — no digits. */
export function sanitizeFullName(value) {
  return String(value).replace(/[0-9]/g, "");
}

/** CNIC as 42101-5618252-7 (5 digits, dash, 7 digits, dash, 1 digit). */
export function formatCnic(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 13);
  const part1 = digits.slice(0, 5);
  const part2 = digits.slice(5, 12);
  const part3 = digits.slice(12, 13);
  if (digits.length <= 5) return part1;
  if (digits.length <= 12) return `${part1}-${part2}`;
  return `${part1}-${part2}-${part3}`;
}

export function isCnicComplete(value) {
  return /^\d{5}-\d{7}-\d$/.test(String(value).trim());
}

/** Pakistani mobile as 03XXXXXXXXX — digits only. */
export function sanitizePhone(value) {
  return String(value).replace(/\D/g, "").slice(0, 11);
}

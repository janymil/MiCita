/** Minimal E.164 helpers tuned for Peru (+51) with a generic fallback. */

export function normalizePeruPhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");

  // Already E.164 (e.g. +51987654321).
  if (digits.startsWith("+")) {
    const e164 = "+" + digits.slice(1).replace(/\D/g, "");
    return isValidE164(e164) ? e164 : null;
  }

  const onlyDigits = digits.replace(/\D/g, "");

  // Peru mobile: 9 digits starting with 9 -> +51XXXXXXXXX
  if (onlyDigits.length === 9 && onlyDigits.startsWith("9")) {
    return `+51${onlyDigits}`;
  }
  // Peru with country code but no plus: 519XXXXXXXX
  if (onlyDigits.length === 11 && onlyDigits.startsWith("51")) {
    return `+${onlyDigits}`;
  }
  // Fallback: assume an international number lacking "+".
  if (onlyDigits.length >= 10 && onlyDigits.length <= 15) {
    return `+${onlyDigits}`;
  }
  return null;
}

export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export function maskPhone(phone: string): string {
  if (phone.length < 5) return "***";
  return phone.slice(0, 3) + "****" + phone.slice(-2);
}

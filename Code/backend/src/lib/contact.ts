export function normalizePersonName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function subscriberNameKey(name: string) {
  return normalizePersonName(name).toLowerCase();
}

export function normalizePhone(phone?: string | null, required = false) {
  const value = (phone?.trim() ?? "").replace(/[\s()-]/g, "");
  if (!value) {
    if (required) throw new Error("Phone number is required");
    return null;
  }
  if (!/^\+\d{6,18}$/.test(value)) throw new Error("Phone number must include one country code followed by digits only");
  if ((value.match(/\+/g) ?? []).length !== 1) throw new Error("Phone number must include only one country code");
  return value;
}

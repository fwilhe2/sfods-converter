export function ensureIsArray(object: any) {
  if (object === undefined) {
    return [];
  }
  if (!Array.isArray(object)) {
    return [object];
  }
  return object;
}

// Escapes a value for safe interpolation into an XML attribute (between double
// quotes). Without this, values/formulas containing & < > or " produce broken
// XML that is silently corrupted on reparse.
export function escapeXmlAttr(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ensureIsArray(object) {
  if (object === undefined || object === null) {
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
export function escapeXmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
// Escapes text for interpolation into element content (no CDATA involved).
export function escapeXmlText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
// A CDATA section cannot contain the sequence "]]>". The only way to carry it
// is to close the section right before the ">" and immediately reopen, so the
// concatenated character data still reads "]]>". Without this, cell text
// containing "]]>" terminates the section early and the remainder of the text is
// reparsed as markup.
export function escapeCdata(text) {
  return String(text).replace(/]]>/g, "]]]]><![CDATA[>");
}
// Escapes text for interpolation into HTML element content or an attribute.
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

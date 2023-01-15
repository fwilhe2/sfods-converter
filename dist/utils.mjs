export function ensureIsArray(object) {
  if (object === undefined) {
    return [];
  }
  if (!Array.isArray(object)) {
    return [object];
  }
  return object;
}

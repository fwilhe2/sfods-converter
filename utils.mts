export function ensureIsArray(object: any) {
  if (object === undefined) {
    return [];
  }
  if (!Array.isArray(object)) {
    return [object];
  }
  return object;
}

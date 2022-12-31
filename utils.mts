export function ensureIsArray(object: any) {
  if (!Array.isArray(object)) {
    return [object];
  }
  return object;
}

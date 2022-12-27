export function encureIsArray(object: any) {
  if (!Array.isArray(object)) {
    return [object];
  }
  return object;
}

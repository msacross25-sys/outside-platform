export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}
export function validUsername(value: string) {
  return /^[a-z0-9_]{3,30}$/.test(value);
}
export function validPassword(value: string) {
  return value.length >= 10 && value.length <= 128;
}

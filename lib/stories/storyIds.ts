/** Prisma `cuid()` ids are alphanumeric and at least 16 characters. */
export function isSafeStoryId(id: string): boolean {
  return /^[a-z0-9]+$/i.test(id) && id.length >= 16 && id.length <= 64;
}

/** Send a signed-out browser back to the sign-in screen. */
export function redirectIfUnsigned(status: number): boolean {
  if (status !== 401 || typeof window === "undefined") return false;
  window.location.assign("/");
  return true;
}

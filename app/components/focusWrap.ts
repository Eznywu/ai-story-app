/**
 * Where Tab should land when it would leave a dialog.
 * Returns an index into the focusable list, or null to let the browser move one step.
 * `activeIndex` of -1 means focus is on the dialog container, not on a control.
 */
export function focusWrapIndex(count: number, activeIndex: number, shiftKey: boolean): number | null {
  if (count <= 0) return null;
  if (shiftKey) {
    if (activeIndex <= 0) return count - 1;
    return null;
  }
  if (activeIndex >= count - 1) return 0;
  return null;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableElements(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => {
    if (node.tabIndex < 0) return false;
    if (node.getAttribute("aria-hidden") === "true") return false;
    return node.getClientRects().length > 0;
  });
}

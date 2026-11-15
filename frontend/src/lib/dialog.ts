import type { KeyboardEvent } from "react";

// Keep keyboard navigation within an open modal, including at either end.
export function containDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    ),
  ).filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0,
  );
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first || !last) return;
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      document.activeElement === event.currentTarget)
  ) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

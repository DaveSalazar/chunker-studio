/**
 * Clipboard-shortcut helpers used by the global Cmd+C / Ctrl+C handler.
 * Both bail out of the custom copy path when the browser's default
 * behaviour should win.
 */

export function isFormElementFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLInputElement) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

export function hasTextSelection(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return false;
  return sel.toString().length > 0;
}

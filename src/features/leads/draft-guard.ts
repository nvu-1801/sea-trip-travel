"use client";

/**
 * A tiny module-level flag for "the consultation form has unsaved input".
 *
 * Switching language navigates, which remounts the form and would discard a
 * half-filled draft. Rather than hide that, the language switch asks before it
 * navigates (see `LocaleSwitcher`). A module-level flag keeps the form and the
 * switch decoupled and avoids threading state through the layout.
 */
let dirty = false;

export function setFormDirty(value: boolean): void {
  dirty = value;
}

export function isFormDirty(): boolean {
  return dirty;
}

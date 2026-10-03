const UNLOCODE_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}$/;

/**
 * Normalize a UN/LOCODE: trim, uppercase, remove spaces between country and location.
 * Examples: `"jp tyo"` → `"JPTYO"`, `"SG-SIN"` → `"SGSIN"`.
 */
export function normalizeUnLocode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Format-only validation for UN/LOCODE (ISO 3166-1 alpha-2 + 3-char location).
 * Does not check membership in the UNECE code list.
 */
export function isValidUnLocode(input: string): boolean {
  return UNLOCODE_PATTERN.test(normalizeUnLocode(input));
}

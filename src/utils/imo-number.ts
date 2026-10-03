const IMO_DIGITS_PATTERN = /^\d{7}$/;
const IMO_WEIGHTS = [7, 6, 5, 4, 3, 2] as const;

/**
 * Normalize an IMO ship identification number: trim, uppercase, strip optional
 * `"IMO"` prefix and separators, leaving seven digits when possible.
 */
export function normalizeImoNumber(input: string): string {
  const trimmed = input.trim().toUpperCase();
  const withoutPrefix = trimmed.startsWith("IMO") ? trimmed.slice(3) : trimmed;
  return withoutPrefix.replace(/[\s-]/g, "");
}

/**
 * Compute the IMO check digit for the first six identification digits.
 */
export function computeImoCheckDigit(firstSixDigits: string): number {
  const digits = normalizeImoNumber(firstSixDigits);
  if (!/^\d{6}$/.test(digits)) {
    throw new Error(`IMO body must be 6 digits; received "${firstSixDigits}"`);
  }

  let sum = 0;
  for (let i = 0; i < 6; i += 1) {
    const digit = Number(digits[i]);
    const weight = IMO_WEIGHTS[i];
    if (weight === undefined) {
      throw new Error("Unexpected IMO weight index");
    }
    sum += digit * weight;
  }
  return sum % 10;
}

/**
 * Return true when `input` is a seven-digit IMO number with a valid check digit.
 */
export function isValidImoNumber(input: string): boolean {
  const normalized = normalizeImoNumber(input);
  if (!IMO_DIGITS_PATTERN.test(normalized)) {
    return false;
  }

  const body = normalized.slice(0, 6);
  const checkDigit = Number(normalized[6]);
  return computeImoCheckDigit(body) === checkDigit;
}

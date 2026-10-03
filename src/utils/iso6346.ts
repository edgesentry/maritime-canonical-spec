/** ISO 6346 character values (multiples of 11 are skipped in the letter map). */
const CHAR_VALUE: Readonly<Record<string, number>> = (() => {
  const map: Record<string, number> = {};
  for (let digit = 0; digit <= 9; digit += 1) {
    map[String(digit)] = digit;
  }
  let value = 10;
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    while (value % 11 === 0) {
      value += 1;
    }
    map[letter] = value;
    value += 1;
  }
  return map;
})();

const CONTAINER_BODY_PATTERN = /^[A-Z]{4}\d{6}$/;
const CONTAINER_NUMBER_PATTERN = /^[A-Z]{4}\d{7}$/;

/**
 * Normalize a freight container number: trim, uppercase, strip spaces/hyphens.
 */
export function normalizeContainerNumber(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Compute the ISO 6346 check digit for the first 10 characters
 * (4-letter owner/category code + 6-digit serial).
 */
export function computeIso6346CheckDigit(ownerAndSerial10: string): number {
  const body = normalizeContainerNumber(ownerAndSerial10);
  if (!CONTAINER_BODY_PATTERN.test(body)) {
    throw new Error(`ISO 6346 body must be 4 letters + 6 digits; received "${ownerAndSerial10}"`);
  }

  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const char = body[i] ?? "";
    const charValue = CHAR_VALUE[char];
    if (charValue === undefined) {
      throw new Error(`Unexpected character "${char}" in ISO 6346 body`);
    }
    sum += charValue * 2 ** i;
  }

  const remainder = sum % 11;
  return remainder === 10 ? 0 : remainder;
}

/**
 * Return true when `input` is a well-formed ISO 6346 container number
 * whose check digit matches the standard algorithm.
 */
export function isValidIso6346ContainerNumber(input: string): boolean {
  const normalized = normalizeContainerNumber(input);
  if (!CONTAINER_NUMBER_PATTERN.test(normalized)) {
    return false;
  }

  const body = normalized.slice(0, 10);
  const checkDigit = Number(normalized[10]);
  return computeIso6346CheckDigit(body) === checkDigit;
}

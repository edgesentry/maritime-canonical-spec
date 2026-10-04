/** Row/column keys used by the encoded Table 7.2.4 matrix. */
export type SegregationTableKey =
  | "1.1"
  | "1.3"
  | "1.4"
  | "2.1"
  | "2.2"
  | "2.3"
  | "3"
  | "4.1"
  | "4.2"
  | "4.3"
  | "5.1"
  | "5.2"
  | "6.1"
  | "6.2"
  | "7"
  | "8"
  | "9";

const DIRECT_KEYS = new Set<string>([
  "1.4",
  "2.1",
  "2.2",
  "2.3",
  "3",
  "4.1",
  "4.2",
  "4.3",
  "5.1",
  "5.2",
  "6.1",
  "6.2",
  "7",
  "8",
  "9",
]);

/**
 * Map a canonical class/division string to a Table 7.2.4 key.
 * Returns null when the class cannot be placed on the general segregation table.
 */
export function toSegregationTableKey(classDivision: string): SegregationTableKey | null {
  if (
    classDivision === "1" ||
    classDivision === "1.1" ||
    classDivision === "1.2" ||
    classDivision === "1.5"
  ) {
    return "1.1";
  }
  if (classDivision === "1.3" || classDivision === "1.6") {
    return "1.3";
  }
  if (DIRECT_KEYS.has(classDivision)) {
    return classDivision as SegregationTableKey;
  }
  return null;
}

/** True when the hazard label is Class 1 (used for subsidiary → 1.3 rule). */
export function isClass1Hazard(classDivision: string): boolean {
  return classDivision === "1" || /^1\.[1-6]$/.test(classDivision);
}

/**
 * Hazards used for table lookup for one item.
 * Subsidiary Class 1 labels are treated as division 1.3 (IMDG 7.2.3.3).
 */
export function hazardsForLookup(
  classDivision: string,
  subsidiaryRisks: readonly string[] | undefined,
): string[] {
  const hazards = [classDivision];
  for (const risk of subsidiaryRisks ?? []) {
    hazards.push(isClass1Hazard(risk) ? "1.3" : risk);
  }
  return hazards;
}

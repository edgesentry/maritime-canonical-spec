import { type SegregationTableKey, toSegregationTableKey } from "./normalize.js";
import type { SegregationCode } from "./types.js";

/**
 * IMDG Code Table 7.2.4 — encoded from IMO IMDG Chapter 7.2.
 *
 * Row/column order matches the official table headers:
 * 1.1 (1.1/1.2/1.5), 1.3 (1.3/1.6), 1.4, 2.1, 2.2, 2.3, 3, 4.1, 4.2, 4.3,
 * 5.1, 5.2, 6.1, 6.2, 7, 8, 9.
 */
const TABLE_KEYS: readonly SegregationTableKey[] = [
  "1.1",
  "1.3",
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
] as const;

/** Compact rows in TABLE_KEYS order (symmetric matrix). */
const ROWS: readonly (readonly SegregationCode[])[] = [
  // 1.1, 1.2, 1.5
  ["*", "*", "*", "4", "2", "2", "4", "4", "4", "4", "4", "4", "2", "4", "2", "4", "X"],
  // 1.3, 1.6
  ["*", "*", "*", "4", "2", "2", "4", "3", "3", "4", "4", "4", "2", "4", "2", "2", "X"],
  // 1.4
  ["*", "*", "*", "2", "1", "1", "2", "2", "2", "2", "2", "2", "X", "4", "2", "2", "X"],
  // 2.1
  ["4", "4", "2", "X", "X", "X", "2", "1", "2", "2", "2", "2", "X", "4", "2", "1", "X"],
  // 2.2
  ["2", "2", "1", "X", "X", "X", "1", "X", "1", "X", "X", "1", "X", "2", "1", "X", "X"],
  // 2.3
  ["2", "2", "1", "X", "X", "X", "2", "X", "2", "X", "X", "2", "X", "2", "1", "X", "X"],
  // 3
  ["4", "4", "2", "2", "1", "2", "X", "X", "2", "2", "2", "2", "X", "3", "2", "X", "X"],
  // 4.1
  ["4", "3", "2", "1", "X", "X", "X", "X", "1", "X", "1", "2", "X", "3", "2", "1", "X"],
  // 4.2
  ["4", "3", "2", "2", "1", "2", "2", "1", "X", "1", "2", "2", "1", "3", "2", "1", "X"],
  // 4.3
  ["4", "4", "2", "2", "X", "X", "2", "X", "1", "X", "2", "2", "X", "2", "2", "1", "X"],
  // 5.1
  ["4", "4", "2", "2", "X", "X", "2", "1", "2", "2", "X", "2", "1", "3", "1", "2", "X"],
  // 5.2
  ["4", "4", "2", "2", "1", "2", "2", "2", "2", "2", "2", "X", "1", "3", "2", "2", "X"],
  // 6.1
  ["2", "2", "X", "X", "X", "X", "X", "X", "1", "X", "1", "1", "X", "1", "X", "X", "X"],
  // 6.2
  ["4", "4", "4", "4", "2", "2", "3", "3", "3", "2", "3", "3", "1", "X", "3", "3", "X"],
  // 7
  ["2", "2", "2", "2", "1", "1", "2", "2", "2", "2", "1", "2", "X", "3", "X", "2", "X"],
  // 8
  ["4", "2", "2", "1", "X", "X", "X", "1", "1", "1", "2", "2", "X", "3", "2", "X", "X"],
  // 9
  ["X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X"],
];

const KEY_INDEX = new Map<SegregationTableKey, number>(
  TABLE_KEYS.map((key, index) => [key, index]),
);

const SEGREGATION_TERM: Record<"1" | "2" | "3" | "4", string> = {
  "1": "away from",
  "2": "separated from",
  "3": "separated by a complete compartment or hold from",
  "4": "separated longitudinally by an intervening complete compartment or hold from",
};

/** Look up Table 7.2.4 for two normalized table keys. */
export function lookupSegregation(a: SegregationTableKey, b: SegregationTableKey): SegregationCode {
  const i = KEY_INDEX.get(a);
  const j = KEY_INDEX.get(b);
  if (i === undefined || j === undefined) {
    throw new Error(`unknown segregation table key: ${a} / ${b}`);
  }
  return ROWS[i][j];
}

/** Look up by raw class/division strings; null if either side is unmapped. */
export function lookupSegregationByClass(classA: string, classB: string): SegregationCode | null {
  const keyA = toSegregationTableKey(classA);
  const keyB = toSegregationTableKey(classB);
  if (!keyA || !keyB) {
    return null;
  }
  return lookupSegregation(keyA, keyB);
}

export function segregationTermName(code: "1" | "2" | "3" | "4"): string {
  return SEGREGATION_TERM[code];
}

const NUMERIC_RANK: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
};

/**
 * Prefer the most stringent numeric segregation code; otherwise keep X / *.
 */
export function pickMostStringent(codes: readonly SegregationCode[]): SegregationCode | null {
  if (codes.length === 0) {
    return null;
  }
  let bestNumeric: "1" | "2" | "3" | "4" | null = null;
  let bestRank = 0;
  let fallback: SegregationCode | null = null;
  for (const code of codes) {
    const rank = NUMERIC_RANK[code];
    if (rank !== undefined) {
      if (rank > bestRank) {
        bestRank = rank;
        bestNumeric = code as "1" | "2" | "3" | "4";
      }
      continue;
    }
    fallback ??= code;
  }
  return bestNumeric ?? fallback;
}

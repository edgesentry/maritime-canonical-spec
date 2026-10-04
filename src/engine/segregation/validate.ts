import type { DgItem } from "../../schemas/dangerous-goods.js";
import { hazardsForLookup } from "./normalize.js";
import { lookupSegregationByClass, pickMostStringent, segregationTermName } from "./table.js";
import type {
  SegregationCode,
  SegregationConflict,
  SegregationOptions,
  SegregationStatus,
  SegregationValidationReport,
} from "./types.js";

const CITATION_TABLE = "IMDG Code 7.2.4 Table 7.2.4";
const CITATION_SAME_CTU = "IMDG Code 7.2.3.2";
const CITATION_CLASS1 = "IMDG Code 7.2.7";
const CITATION_ART21 = "危規則第21条";
const CITATION_ART33 = "危規則第33条";
const CITATION_FLASHPOINT = "IMDG Class 3 flashpoint caution";

const FLASHPOINT_WARNING_CELSIUS = 23;

function useJapanOverlay(options?: SegregationOptions): boolean {
  return options?.japanKikisonOverlay !== false;
}

function japanCitations(enabled: boolean): string[] {
  return enabled ? [CITATION_ART21, CITATION_ART33] : [];
}

function aggregateStatus(conflicts: readonly SegregationConflict[]): SegregationStatus {
  if (conflicts.some((c) => c.violated)) {
    return "CRITICAL_VIOLATION";
  }
  if (conflicts.length > 0) {
    return "WARNING";
  }
  return "PASS";
}

function uniqueCitations(lists: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (!seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
  }
  return out;
}

function pairCodes(a: DgItem, b: DgItem): SegregationCode[] {
  const codes: SegregationCode[] = [];
  for (const hazardA of hazardsForLookup(a.classDivision, a.subsidiaryRisks)) {
    for (const hazardB of hazardsForLookup(b.classDivision, b.subsidiaryRisks)) {
      const code = lookupSegregationByClass(hazardA, hazardB);
      if (code) {
        codes.push(code);
      }
    }
  }
  return codes;
}

function conflictForPair(
  a: DgItem,
  b: DgItem,
  code: SegregationCode,
  japan: boolean,
): { conflict: SegregationConflict; citations: string[] } | null {
  const jp = japanCitations(japan);

  if (code === "1" || code === "2" || code === "3" || code === "4") {
    const term = segregationTermName(code);
    return {
      conflict: {
        unNumbers: [a.unNumber, b.unNumber],
        properShippingNames: [a.properShippingName, b.properShippingName],
        classes: [a.classDivision, b.classDivision],
        containerNumber: a.containerNumber,
        requiredSegregation: code,
        violated: true,
        message:
          `IMDG 7.2.4 Table: Class ${a.classDivision} (UN ${a.unNumber}) and ` +
          `Class ${b.classDivision} (UN ${b.unNumber}) require "${term}" ` +
          `(code ${code}) and cannot be loaded into the same container ` +
          `${a.containerNumber}.`,
      },
      citations: [CITATION_TABLE, CITATION_SAME_CTU, ...jp],
    };
  }

  if (code === "X") {
    return {
      conflict: {
        unNumbers: [a.unNumber, b.unNumber],
        properShippingNames: [a.properShippingName, b.properShippingName],
        classes: [a.classDivision, b.classDivision],
        containerNumber: a.containerNumber,
        requiredSegregation: code,
        violated: false,
        message: `IMDG 7.2.4 Table: Class ${a.classDivision} (UN ${a.unNumber}) and Class ${b.classDivision} (UN ${b.unNumber}) intersect as "X" — consult the Dangerous Goods List (column 16b) before co-loading in ${a.containerNumber}.`,
      },
      citations: [CITATION_TABLE, ...jp],
    };
  }

  if (code === "*") {
    return {
      conflict: {
        unNumbers: [a.unNumber, b.unNumber],
        properShippingNames: [a.properShippingName, b.properShippingName],
        classes: [a.classDivision, b.classDivision],
        containerNumber: a.containerNumber,
        requiredSegregation: code,
        violated: false,
        message: `IMDG 7.2.4 Table: Class 1 pair UN ${a.unNumber} / UN ${b.unNumber} requires Class 1 compatibility-group rules (7.2.7) — not evaluated in v1.`,
      },
      citations: [CITATION_TABLE, CITATION_CLASS1, ...jp],
    };
  }

  return null;
}

function flashpointConflicts(items: readonly DgItem[]): {
  conflicts: SegregationConflict[];
  citations: string[];
} {
  const conflicts: SegregationConflict[] = [];
  for (const item of items) {
    const hazards = hazardsForLookup(item.classDivision, item.subsidiaryRisks);
    if (!hazards.includes("3")) {
      continue;
    }
    const fp = item.flashPoint;
    if (fp?.unit !== "CEL" || !(fp.value < FLASHPOINT_WARNING_CELSIUS)) {
      continue;
    }
    conflicts.push({
      unNumbers: [item.unNumber, item.unNumber],
      properShippingNames: [item.properShippingName, item.properShippingName],
      classes: [item.classDivision, item.classDivision],
      containerNumber: item.containerNumber,
      requiredSegregation: "FP",
      violated: false,
      message:
        `Flashpoint caution: UN ${item.unNumber} (Class ${item.classDivision}) ` +
        `has flash point ${fp.value}°C (< ${FLASHPOINT_WARNING_CELSIUS}°C).`,
    });
  }
  return {
    conflicts,
    citations: conflicts.length > 0 ? [CITATION_FLASHPOINT] : [],
  };
}

/**
 * Deterministic IMDG Chapter 7.2 segregation check for a list of DG items.
 * See `docs/engine/segregation.en.md` / `docs/engine/segregation.ja.md`.
 */
export function validateSegregation(
  items: readonly DgItem[],
  options?: SegregationOptions,
): SegregationValidationReport {
  const japan = useJapanOverlay(options);
  const conflicts: SegregationConflict[] = [];
  const citationLists: string[][] = [];

  const byContainer = new Map<string, DgItem[]>();
  for (const item of items) {
    const list = byContainer.get(item.containerNumber) ?? [];
    list.push(item);
    byContainer.set(item.containerNumber, list);
  }

  for (const group of byContainer.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i];
        const b = group[j];
        const code = pickMostStringent(pairCodes(a, b));
        if (!code) {
          continue;
        }
        const result = conflictForPair(a, b, code, japan);
        if (result) {
          conflicts.push(result.conflict);
          citationLists.push(result.citations);
        }
      }
    }
  }

  const fp = flashpointConflicts(items);
  conflicts.push(...fp.conflicts);
  if (fp.citations.length > 0) {
    citationLists.push(fp.citations);
  }

  return {
    status: aggregateStatus(conflicts),
    conflicts,
    citations: uniqueCitations(citationLists),
  };
}

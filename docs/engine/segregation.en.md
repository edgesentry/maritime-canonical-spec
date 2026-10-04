# IMDG segregation validation engine

Normative contract for `validateSegregation` in `@maritime-ai/canonical-spec`
([GitHub issue #23](https://github.com/edgesentry/maritime-canonical-spec/issues/23)).
Unit tests mirror the acceptance cases below.

This is an engineering contract derived from public international and domestic
regulatory text. It is not legal advice.

Japanese: [`segregation.ja.md`](./segregation.ja.md)

## 1. Purpose

Deterministically validate co-loaded dangerous goods items against:

1. IMO IMDG Code Chapter 7.2 general segregation provisions (Table 7.2.4 and related rules).
2. Japanese domestic rules on segregation for vessel transport (危険物船舶運送及び貯蔵規則),
   as a configurable citation overlay.

Publishing this engine under Apache-2.0 provides a transparent, reproducible baseline
for insurers, tribunals, and digital platforms—without proprietary black boxes.

## 2. Provenance

| Role | Authority | What we take |
| --- | --- | --- |
| Segregation matrix & same-CTU ban | IMO IMDG Code Chapter 7.2 | Table 7.2.4 symbols (`1`/`2`/`3`/`4`/`X`/`*`); 7.2.3.2; 7.2.3.3 |
| Domestic citation overlay | 危険物船舶運送及び貯蔵規則 | **Article 21** (危険物等の隔離), **Article 33** (コンテナ相互の隔離) |
| Input types | `DgItem` in this package | `unNumber`, `properShippingName`, `classDivision`, `subsidiaryRisks`, `flashPoint`, `containerNumber` |

### Article numbering note

Some secondary summaries cite Arts. 14 and 15 as segregation. In the statutory text,
Article 14 is a bulk-container exception and Article 15 covers overpacks.
Segregation duties are **Article 21** and **Article 33**. Citations MUST use 21 and 33.

## 3. Input contract

- Entry point: `validateSegregation(items: readonly DgItem[], options?)`.
- Validation scope is **pairwise within the same `containerNumber`** (same CTU).
- Class codes normalize to Table 7.2.4 keys:

| `classDivision` | Table key |
| --- | --- |
| `1.1`, `1.2`, `1.5` | `1.1` |
| `1.3`, `1.6` | `1.3` |
| `1.4` | `1.4` |
| bare `1` | `1.1` (most stringent Class 1 group; defensive default) |
| `2.1`–`2.3`, `3`, `4.1`–`4.3`, `5.1`, `5.2`, `6.1`, `6.2`, `7`, `8`, `9` | same string |

## 4. Segregation algorithm

For each unordered pair of items sharing a `containerNumber`:

1. Build hazard sets: primary `classDivision` plus each `subsidiaryRisks` entry.
2. Subsidiary Class 1 (`1` or `1.x`) is treated as division **`1.3`** (IMDG 7.2.3.3).
3. Look up Table 7.2.4 for every hazard pair; take the most stringent numeric code
   (`4` > `3` > `2` > `1`), preferring numeric over `X` / `*`.
4. Map the cell to a conflict (next section).

Class 1 vs Class 1 (`*`) means “see 7.2.7”; compatibility groups are **out of scope** in v1.

## 5. Status mapping

| Table cell / rule | Conflict | `violated` | Report status contribution |
| --- | --- | --- | --- |
| `1`, `2`, `3`, `4` | yes | `true` | `CRITICAL_VIOLATION` |
| `X` | yes | `false` | `WARNING` |
| `*` | yes | `false` | `WARNING` |
| Class 3 flash point &lt; 23 °C | yes (`requiredSegregation: "FP"`) | `false` | `WARNING` |

Aggregate: any `violated` → `CRITICAL_VIOLATION`; else any conflict → `WARNING`; else `PASS`.

## 6. Output contract

```ts
type SegregationStatus = "PASS" | "WARNING" | "CRITICAL_VIOLATION";

type SegregationConflict = {
  unNumbers: [string, string];
  properShippingNames: [string, string];
  classes: [string, string];
  containerNumber: string;
  requiredSegregation: "1" | "2" | "3" | "4" | "X" | "*" | "FP";
  violated: boolean;
  message: string;
};

type SegregationValidationReport = {
  status: SegregationStatus;
  conflicts: SegregationConflict[];
  citations: string[];
};

type SegregationOptions = {
  /** default true — include 危規則第21条 / 第33条 in citations */
  japanKikisonOverlay?: boolean;
};
```

## 7. Public API

```ts
import { validateSegregation } from "@maritime-ai/canonical-spec";

const report = validateSegregation(items, { japanKikisonOverlay: true });
```

Implementation: `src/engine/segregation/`.

## 8. Out of scope (v1)

- Full Dangerous Goods List / UN master (column 16b SG codes)
- Class 1 compatibility group matrix (7.2.7)
- Chemical segregation-group rules beyond input field `segregationGroups`

## 9. Acceptance cases

| # | Scenario | Expected |
| --- | --- | --- |
| A | Class `1.1` + Class `5.1` same CTU | `CRITICAL_VIOLATION` (table `4`) |
| B | Class `2.1` + Class `3` same CTU | `CRITICAL_VIOLATION` (table `2`) |
| C | Class `1.1` + Class `5.1` different CTUs | `PASS` |
| D | Class `3` + Class `8` same CTU | `WARNING` (table `X`) |
| E | Class `3` with flashPoint `12` CEL | `WARNING` (`FP`) |
| F | Primary `8` + subsidiary `5.1` vs Class `3` | `CRITICAL_VIOLATION` (`5.1`×`3` = `2`) |
| G | Single Class `3`, flashPoint `23` CEL | `PASS` |
| H | Overlay `japanKikisonOverlay: false` on critical pair | IMDG citations only (no 危規則) |

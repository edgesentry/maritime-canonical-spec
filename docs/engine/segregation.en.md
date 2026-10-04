# IMDG Dangerous Goods Segregation Validation Engine (Developer Guide)

This guide explains the purpose, architecture, and integration of the deterministic segregation validation engine (`validateSegregation`) in `@maritime-ai/canonical-spec` for **software engineers with zero background in maritime logistics or maritime law**.

日本語: [`segregation.ja.md`](./segregation.ja.md)

---

## 1. Executive Summary: Why Does This Engine Exist?

### The Real-World Danger
Every day, ocean container vessels transport dangerous cargo: industrial chemicals, fireworks, lithium batteries, flammable liquids, and compressed gases.

What happens if **explosives (Class 1)** and **oxidizing substances that fiercely accelerate fires (Class 5.1)** are packed together into the same airtight container?  
Under high ambient temperatures, vessel vibration, or accidental container leaks, chemical reactions can trigger catastrophic fires or massive explosions at sea, causing hundreds of millions of dollars in damages and putting crew lives at risk.

### What This Engine Solves
To prevent these disasters, the International Maritime Organization (IMO) mandates the **International Maritime Dangerous Goods (IMDG) Code**. Chapter 7.2 of the code establishes strict **segregation (co-loading prohibition) rules** specifying which dangerous goods may never share the same container.

This engine is a **pure, zero-hallucination deterministic validation library**. Given a list of hazardous items assigned to shipping containers, it mathematically checks whether the co-loading combination is legally and physically safe.

```text
 Inbound Cargo Manifest Data (UN Number, Class, Container Number)
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ validateSegregation()                                       │
 │  ① Group by containerNumber                                 │
 │  ② Pairwise matrix lookup against IMO IMDG Table 7.2.4      │
 │  ③ Cross-reference Japanese statutory rules (危規則)        │
 └─────────────────────────────┬───────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
      【PASS: Compliant】             【CRITICAL_VIOLATION: Banned】
   Safe to file / load on ship     Instantly block filing & alert operator
```

---

## 2. Maritime Terminology Cheat Sheet for Developers

You only need to understand these fundamental concepts to work with this engine:

| Term | Pronunciation / Definition | Plain English Explanation |
| :--- | :--- | :--- |
| **CTU** | Cargo Transport Unit | **A freight container** (or vehicle trailer). In this engine, items sharing the same `containerNumber` are considered inside the same CTU. |
| **IMDG Code** | International Maritime Dangerous Goods Code | **The global rulebook** adopted under the IMO SOLAS convention that regulates the maritime transport of dangerous goods worldwide. |
| **UN Number** | United Nations Number | **A 4-digit numeric ID** assigned to dangerous substances globally. Regardless of language (English, Japanese, German), the ID identifies the chemical. (e.g., `UN1203` = Gasoline, `UN1993` = Flammable Liquid N.O.S., `UN0004` = Ammonium Picrate / Explosive). |
| **Class / Division** | Hazard Classification | **A code categorizing the primary risk**: <br>• `1.x`: Explosives<br>• `2.x`: Gases<br>• `3`: Flammable liquids (alcohol, fuels)<br>• `5.1`: Oxidizing substances (compounds that feed oxygen to fire)<br>• `8`: Corrosive substances (acids, caustics) |
| **Segregation** | Co-loading separation | **Rules dictating physical separation**. Segregation levels 1 to 4 prohibit packing items into the same container. |
| **危規則** | Kikisoku (Japanese Domestic Law) | Japan's domestic regulation on dangerous goods maritime carriage (*危険物船舶運送及び貯蔵規則*). Japanese port departures must comply with Articles 21 and 33 in addition to IMDG. |
| **Flash Point** | Minimum ignition temperature | The lowest liquid temperature (°C) at which vapors ignite. Liquids with **flash point &lt; 23°C** pose severe volatility risks in closed containers and trigger specialized warnings (`FP`). |

---

## 3. Quick Start

### Installation
```bash
pnpm add @maritime-ai/canonical-spec
```

### Minimal Usage Example (Detecting Illegal Co-loading)

```typescript
import { validateSegregation, type DgItem } from "@maritime-ai/canonical-spec";

// Scenario: Two incompatible items packed into the same container (MSKU1234565)
const items: DgItem[] = [
  {
    unNumber: "0004",              // Ammonium Picrate
    properShippingName: "AMMONIUM PICRATE",
    classDivision: "1.1",          // ★ Class 1.1: Explosives (mass explosion hazard)
    packingGroup: "II",
    marinePollutant: false,
    containerNumber: "MSKU1234565", // ★ Container A
    quantity: { grossMass: { value: 500, unit: "KGM" } },
    packageCount: { count: 10, packagingTypeCode: "4G" },
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
  },
  {
    unNumber: "1479",              // Oxidizing solid
    properShippingName: "OXIDIZING SOLID, N.O.S.",
    classDivision: "5.1",          // ★ Class 5.1: Oxidizer (intensifies fire)
    packingGroup: "II",
    marinePollutant: false,
    containerNumber: "MSKU1234565", // ★ Container A (SAME container!)
    quantity: { grossMass: { value: 1200, unit: "KGM" } },
    packageCount: { count: 20, packagingTypeCode: "1A2" },
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
  },
];

// Execute deterministic validation
const report = validateSegregation(items);

console.log(report.status);
// ➔ "CRITICAL_VIOLATION" (Prohibited co-loading!)

console.log(report.conflicts[0]);
// ➔ {
//      unNumbers: ["0004", "1479"],
//      classes: ["1.1", "5.1"],
//      containerNumber: "MSKU1234565",
//      requiredSegregation: "4",
//      violated: true,
//      message: "IMDG Table 7.2.4 requires segregation level 4 between Class 1.1 and Class 5.1..."
//    }

console.log(report.citations);
// ➔ [
//      "IMO IMDG Code Chapter 7.2 Table 7.2.4",
//      "危険物船舶運送及び貯蔵規則第21条",
//      "危険物船舶運送及び貯蔵規則第33条"
//    ]
```

---

## 4. How the Algorithm Works (Internal Logic)

```text
[Step 1: Container Grouping]
  Items are grouped by containerNumber.
  * Items in different containers are physically separated on deck/holds;
    they do not violate intra-container co-loading rules.
       │
       ▼
[Step 2: Pairwise Combinations]
  Within each container, evaluate every unordered 2-item pair (Item A, Item B).
       │
       ▼
[Step 3: Hazard Matrix Lookup]
  For all hazard combinations (primary classDivision + subsidiaryRisks),
  consult IMO IMDG Code Table 7.2.4 (Segregation Table).
       │
       ▼
[Step 4: Cell Evaluation]
  • If the cell value is "1", "2", "3", or "4":
      ➔ Strictly banned in the same container (violated: true ➔ CRITICAL_VIOLATION)
  • If the cell value is "X" or "*":
      ➔ Requires manual review of specific provisions (violated: false ➔ WARNING)
  • If Class 3 has flash point < 23°C:
      ➔ Volatility warning (requiredSegregation: "FP" ➔ WARNING)
```

### Understanding Table 7.2.4 Cell Values

| Cell Value | Treaty Term | Operational Meaning | Validation Result |
| :---: | :--- | :--- | :---: |
| **`1`** | **Away from** | Minimum 3m separation. **Prohibited in same CTU** (IMDG 7.2.3.2) | ❌ **CRITICAL_VIOLATION** |
| **`2`** | **Separated from** | Bulkhead separation. **Prohibited in same CTU** | ❌ **CRITICAL_VIOLATION** |
| **`3`** | **Separated by complete compartment** | Complete fireproof deck/bulkhead. **Prohibited in same CTU** | ❌ **CRITICAL_VIOLATION** |
| **`4`** | **Separated longitudinally** | Longitudinal separation by entire hold. **Prohibited in same CTU** | ❌ **CRITICAL_VIOLATION** |
| **`X`** | **DGL Specific** | Generally allowed, but must consult individual UN schedule in DGL | ⚠️ **WARNING** (Advisory) |
| **`*`** | **Class 1 Specific** | Explosives compatibility group provisions apply (IMDG 7.2.7) | ⚠️ **WARNING** (Advisory) |
| **`FP`** | **Low Flash Point** | Class 3 liquid with flash point &lt; 23°C (high closed-space vapor risk) | ⚠️ **WARNING** (Precaution) |

---

## 5. Output Types & Application Integration

```typescript
type SegregationStatus = "PASS" | "WARNING" | "CRITICAL_VIOLATION";

type SegregationConflict = {
  unNumbers: [string, string];          // Conflicting UN IDs (e.g. ["0004", "1479"])
  properShippingNames: [string, string];// Proper shipping names
  classes: [string, string];            // Conflicting classes (e.g. ["1.1", "5.1"])
  containerNumber: string;              // Target container ID
  requiredSegregation: "1" | "2" | "3" | "4" | "X" | "*" | "FP";
  violated: boolean;                    // true if legally prohibited from co-loading
  message: string;                      // Human-readable diagnostic description
};

type SegregationValidationReport = {
  status: SegregationStatus;            // Overall outcome
  conflicts: SegregationConflict[];     // List of detected conflicts
  citations: string[];                  // Formal legal citations for audit trails
};
```

### Recommended UI & Backend Workflow

| `report.status` | State Meaning | Backend Pipeline Action | UI / Operator Presentation |
| :--- | :--- | :--- | :--- |
| **`PASS`** | 100% compliant | Allow automated filing (Cyber Port, EDI) | Display green badge ("✅ Segregation Passed"); enable one-tap dispatch |
| **`WARNING`** | Advisory condition | Permit dispatch, attach audit note | Display yellow alert ("⚠️ Note: Low flash point / special DGL rules apply") |
| **`CRITICAL_VIOLATION`** | **Illegal co-loading** | **Physically block dispatch pipeline** | Display red modal ("❌ Banned Co-Loading: Segregate into separate containers"); lock one-tap button (Active Friction) |

---

## 6. Statutory Citations & Forensic Audit Evidence

For insurer claims, indemnity subrogation, and maritime arbitration (e.g. London Maritime Arbitrators Association - LMAA), `report.citations` outputs formal legal references:

1. **International Law**: IMO IMDG Code Chapter 7.2 (Table 7.2.4, Sections 7.2.3.2 & 7.2.3.3)
2. **Japanese Domestic Law**: 危険物船舶運送及び貯蔵規則 (Kikisoku)
   * **Article 21**: Duty of segregation between dangerous goods
   * **Article 33**: Duty of segregation between transport units (containers)

> **Developer Note on Statutory Numbering**:  
> Obsolete third-party articles sometimes cite Arts. 14 & 15. In actual Japanese statutory text, Art. 14 is a bulk container exception and Art. 15 covers overpacks. The true statutory authority for segregation is **Articles 21 and 33**.

---

## 7. Configuration Options

```typescript
// For international ports outside Japan (omits Japanese 危規則 citations)
const report = validateSegregation(items, {
  japanKikisonOverlay: false, // Default is true
});
```

---

## 8. FAQ

**Q. If two dangerous items are in different containers, does it trigger an error?**  
**A. No.** This engine validates co-loading within the *same* container (CTU). Items with distinct `containerNumber`s are physically enclosed separately, returning `PASS`. (Vessel stowage placement across slots is governed by the carrier's stowage planning system).

**Q. Does this require network connectivity or external database lookups?**  
**A. Zero external dependencies.** The engine is pure, self-contained TypeScript embedding the complete static Table 7.2.4 matrix. It executes in microseconds in Cloudflare Workers, Node.js, or browser runtimes.


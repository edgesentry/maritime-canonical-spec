# IMDG Dangerous Goods Segregation Validation Engine (Developer Guide & Technical Specification)

This technical specification is designed for **software engineers with zero background in maritime logistics, port operations, or maritime law**. It details the design rationale, domain logic, and API specification of the deterministic segregation validation engine (`validateSegregation`) in `@maritime-ai/canonical-spec`, enabling seamless integration into core logistics pipelines, EDI gateways, and operational workflows.

日本語: [`segregation.ja.md`](./segregation.ja.md)

---

## 1. System Overview & Engineering Rationale: The Need for Deterministic Hazard Segregation

### Physical Risks and Domain Characteristics in Maritime Container Shipping
In ocean containerized logistics, vast quantities of **Dangerous Goods (DG)**—such as industrial chemicals, semiconductor precursors, lithium-ion energy storage systems, compressed gases, and active pharmaceutical ingredients—are transported globally every day.

Inside a single sealed maritime container (Cargo Transport Unit: CTU), if **explosives (Class 1) and oxidizing agents (Class 5.1)** are co-loaded into the same enclosed space, environmental stressors during sea voyages (ambient thermal cycles, vessel motion, wave slam, micro-leakage) can trigger violent, self-accelerating redox chain reactions. These interactions lead to catastrophic enclosed container explosions and uncontainable vessel fires at sea. A single modern container ship fire frequently results in systemic losses exceeding hundreds of millions to over a billion USD, in addition to environmental pollution and loss of seafarer lives.

### Responsibilities of This Validation Engine
Under the International Convention for the Safety of Life at Sea (SOLAS Chapter VII), the International Maritime Organization (IMO) establishes the mandatory **International Maritime Dangerous Goods (IMDG) Code**. Chapter 7.2 of the IMDG Code strictly defines segregation requirements—mandating which hazardous cargo classes may never be co-loaded within the same Cargo Transport Unit (CTU).

This engine consumes structured dangerous goods declaration and booking items and **determines whether any cargo combination co-loaded within the same container is legally compliant and physically safe with 100% mathematical determinism (zero-hallucination static evaluation devoid of probabilistic ambiguity)**.

```text
 Inbound Cargo Manifest Data (UN Number, Class, Container Number)
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ validateSegregation()                                       │
 │  ① Physical boundary partitioning per containerNumber       │
 │  ② Global treaty matrix lookup against IMO IMDG Table 7.2.4 │
 │  ③ Japanese statutory rules overlay (危規則 Arts. 21 & 33)   │
 └─────────────────────────────┬───────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
      【PASS: Compliant】             【CRITICAL_VIOLATION: Banned】
   Segregation requirements met     Prohibited co-loading inside same CTU
  Safe for statutory EDI / loading  Fail-closed block via Active Friction
```

---

## 2. Maritime Logistics Terminology for Software Engineers

Core domain concepts required for codebase navigation and schema mapping:

| Term | Formal Definition | Software Engineering Interpretation |
| :--- | :--- | :--- |
| **CTU** | Cargo Transport Unit | **A single freight container** (or vehicle trailer). The primary physical enclosure boundary in this engine, partitioned by the `containerNumber` property. |
| **IMDG Code** | International Maritime Dangerous Goods Code | **The global regulatory framework** adopted under IMO SOLAS Chapter VII governing the safe maritime carriage of dangerous goods. |
| **UN Number** | United Nations Number | **A 4-digit numeric identifier** assigned to dangerous substances globally. Language-agnostic canonical identifier (e.g., `UN1203` = Gasoline, `UN1993` = Flammable Liquid N.O.S., `UN0004` = Ammonium Picrate). |
| **Class / Division** | Hazard Classification | **Primary hazard categories**: <br>• `1.1`–`1.6`: Explosives<br>• `2.1`–`2.3`: Gases (flammable, toxic, non-flammable)<br>• `3`: Flammable liquids<br>• `5.1`: Oxidizing substances (oxygen donors accelerating combustion)<br>• `8`: Corrosive substances |
| **Segregation** | Spatial Separation Requirements | **Mandated physical distance or barrier separation** between incompatible dangerous goods. Segregation levels 1 to 4 strictly prohibit packing items into the same CTU. |
| **危規則 (Kikisoku)** | Ordinance for Carriage and Storage of Dangerous Goods by Ships | Japan's domestic ministerial ordinance under the Ship Safety Act. Vessels departing Japanese ports must comply with Articles 21 and 33 in addition to the IMDG Code. |
| **Flash Point** | Flash Point (Closed Cup) | The lowest liquid temperature (°C) at which combustible vapors ignite. In the IMDG Code, liquids with **flash point &lt; 23°C** pose high volatility risks in enclosed spaces and trigger precautionary warnings (`FP`). |

---

## 3. Quick Start

### Installation
```bash
pnpm add @maritime-ai/canonical-spec
```

### Minimal Implementation: Detecting Prohibited Intra-Container Co-Loading

```typescript
import { validateSegregation, type DgItem } from "@maritime-ai/canonical-spec";

// Scenario: Two incompatible items assigned to the same container (MSKU1234565)
const manifestItems: DgItem[] = [
  {
    unNumber: "0004",              // Ammonium Picrate
    properShippingName: "AMMONIUM PICRATE",
    classDivision: "1.1",          // Class 1.1: Explosives (mass explosion hazard)
    packingGroup: "II",
    marinePollutant: false,
    containerNumber: "MSKU1234565", // Container A
    quantity: { grossMass: { value: 500, unit: "KGM" } },
    packageCount: { count: 10, packagingTypeCode: "4G" },
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
  },
  {
    unNumber: "1479",              // Oxidizing solid
    properShippingName: "OXIDIZING SOLID, N.O.S.",
    classDivision: "5.1",          // Class 5.1: Oxidizing substance (intensifies fire)
    packingGroup: "II",
    marinePollutant: false,
    containerNumber: "MSKU1234565", // Container A (SAME CTU!)
    quantity: { grossMass: { value: 1200, unit: "KGM" } },
    packageCount: { count: 20, packagingTypeCode: "1A2" },
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
  },
];

// Execute deterministic validation
const report = validateSegregation(manifestItems);

console.log(report.status);
// => "CRITICAL_VIOLATION" (Prohibited co-loading in same container)

console.log(report.conflicts[0]);
// => {
//      unNumbers: ["0004", "1479"],
//      classes: ["1.1", "5.1"],
//      containerNumber: "MSKU1234565",
//      requiredSegregation: "4",
//      violated: true,
//      message: "IMDG Table 7.2.4 requires segregation level 4 between Class 1.1 and Class 5.1..."
//    }

console.log(report.citations);
// => [
//      "IMO IMDG Code Chapter 7.2 Table 7.2.4",
//      "危険物船舶運送及び貯蔵規則第21条",
//      "危険物船舶運送及び貯蔵規則第33条"
//    ]
```

---

## 4. Validation Algorithm Specification & Internal Architecture

The validation pipeline executes deterministically as a pure function through the following stages:

```text
[Step 1: Physical Boundary Partitioning]
  Partition all cargo items by containerNumber.
  * Items assigned to distinct containers are physically enclosed separately;
    they do not trigger intra-CTU co-loading violations.
       │
       ▼
[Step 2: Intra-Container Pairwise Evaluation]
  Within each container, generate every unordered 2-item combination (Item A, Item B).
       │
       ▼
[Step 3: Hazard Attribute Expansion]
  Extract primary classDivision and subsidiaryRisks for both items.
  * If a subsidiary risk is Class 1 (explosives), IMDG 7.2.3.3 mandates evaluating
    it as "1.3" within the segregation matrix.
       │
       ▼
[Step 4: Table 7.2.4 Matrix Lookup]
  Look up the required segregation level from IMO IMDG Code Table 7.2.4.
  If multiple hazard combinations apply, resolve to the most stringent constraint (4 > 3 > 2 > 1 > X / *).
       │
       ▼
[Step 5: Compliance Assessment & Report Generation]
  • Cell value "1", "2", "3", or "4":
      violated: true ➔ CRITICAL_VIOLATION (Strictly prohibited inside the same CTU)
  • Cell value "X" or "*":
      violated: false ➔ WARNING (Manual review of individual DGL / compatibility schedule required)
  • Class 3 with flash point < 23°C:
      violated: false ➔ WARNING (requiredSegregation: "FP", closed-space volatility precaution)
```

### Engineering Interpretation of Table 7.2.4 Cell Values

| Cell Value | Treaty Term | Naval Architectural Requirement | Intra-Container Determination |
| :---: | :--- | :--- | :---: |
| **`1`** | **Away from** | Minimum 3m horizontal distance | ❌ **CRITICAL_VIOLATION** (Co-loading banned) |
| **`2`** | **Separated from** | Effective bulkhead / deck separation | ❌ **CRITICAL_VIOLATION** (Co-loading banned) |
| **`3`** | **Separated by complete compartment** | Complete fireproof bulkhead or cargo hold separation | ❌ **CRITICAL_VIOLATION** (Co-loading banned) |
| **`4`** | **Separated longitudinally** | Longitudinal separation by intervening hold (most stringent) | ❌ **CRITICAL_VIOLATION** (Co-loading banned) |
| **`X`** | **DGL Specific** | Generally permissible; consult Dangerous Goods List (DGL) | ⚠️ **WARNING** (Advisory review) |
| **`*`** | **Class 1 Specific** | Governed by explosive compatibility group provisions (7.2.7) | ⚠️ **WARNING** (Compatibility review) |
| **`FP`** | **Low Flash Point** | Flammable liquid with flash point &lt; 23°C (high vapor density risk) | ⚠️ **WARNING** (Precautionary notice) |

---

## 5. Output Schema & System Architecture Integration

### TypeScript Definitions
```typescript
type SegregationStatus = "PASS" | "WARNING" | "CRITICAL_VIOLATION";

type SegregationConflict = {
  unNumbers: [string, string];          // Conflicting UN ID pair
  properShippingNames: [string, string];// Conflicting proper shipping names
  classes: [string, string];            // Conflicting class division pair
  containerNumber: string;              // Target container identifier
  requiredSegregation: "1" | "2" | "3" | "4" | "X" | "*" | "FP";
  violated: boolean;                    // Violation flag (true = co-loading prohibited)
  message: string;                      // Audit message & diagnostic detail
};

type SegregationValidationReport = {
  status: SegregationStatus;            // Aggregate validation status
  conflicts: SegregationConflict[];     // List of detected conflicts and warnings
  citations: string[];                  // Formal statutory & treaty provisions for legal audit
};
```

### Recommended Architectural Handling

| `report.status` | System State | Backend Pipeline Control | Frontend / Operator UI |
| :--- | :--- | :--- | :--- |
| **`PASS`** | Fully Compliant | Permit automated EDI export (Cyber Port, EDIFACT) and dispatch | Green status indicator ("Compliant"). Enable one-tap approval |
| **`WARNING`** | Conditional Compliance<br>(Advisory) | Permit dispatch; append advisory notice to audit log | Yellow status indicator ("Review Required: Low flash point or specific DGL rules"). Display toast advisory |
| **`CRITICAL_VIOLATION`** | **Statutory Violation**<br>(Co-Loading Banned) | **Physically sever outbound EDI pipeline (Fail-Closed)** | **Red alert modal. Lock one-tap submission button**; enforce container split or cargo correction (Active Friction) |

---

## 6. Statutory Citations & Authoritative Normative References

The `citations` array and validation logic are directly derived from the following official international conventions, industry standards, and statutory acts. They provide full forensic traceability for cargo insurance claims, subrogation litigation, and maritime arbitration (e.g., London Maritime Arbitrators Association - LMAA).

### International Treaties & Industry Standards
* **IMO (International Maritime Organization) - IMDG Code**:  
  [International Maritime Dangerous Goods (IMDG) Code](https://www.imo.org/en/OurWork/Safety/Pages/DangerousGoods-default.aspx)  
  *Mandatory Provisions*: Chapter 7.2 (Segregation), Table 7.2.4 (Segregation Table on board container ships), Sections 7.2.3.2 & 7.2.3.3.
* **IMO - SOLAS Convention**:  
  [International Convention for the Safety of Life at Sea (SOLAS), 1974](https://www.imo.org/en/About/Conventions/Pages/International-Convention-for-the-Safety-of-Life-at-Sea-(SOLAS),-1974.aspx)  
  *Mandatory Provisions*: Chapter VII (Carriage of dangerous goods).
* **DCSA (Digital Container Shipping Association) - Dangerous Goods Interface Standard**:  
  [DCSA Standard for Dangerous Goods Data Interface 1.0](https://dcsa.org/standards/dangerous-goods/)  
  *Interoperability Standard*: Carrier-to-port automated DG validation and data exchange specifications.
* **TT Club & CINS - Cargo Integrity White Paper**:  
  [TT Club & CINS Cargo Integrity White Paper](https://www.ttclub.com/news-and-resources/publications/cargo-integrity-white-paper/)  
  *Engineering Rationale*: Establishes that 66% of container fire incidents result from misdeclaration or improper segregation, recommending automated algorithmic pre-screening to eliminate human error.

### Japanese Domestic Statutory Framework
* **e-Gov Law Search - Ship Safety Act (船舶安全法)**:  
  [船舶安全法（昭和8年法律第11号）](https://laws.e-gov.go.jp/law/308AC0000000011)  
  *Statutory Authority*: Article 2 (Duty of Seaworthiness & Life Safety), Article 28 (Dangerous Goods Transport Ordinance Delegation).
* **e-Gov Law Search - Dangerous Goods Ship Transport and Storage Rules (危規則)**:  
  [危険物船舶運送及び貯蔵規則（昭和32年運輸省令第30号）](https://laws.e-gov.go.jp/law/332M50000800030)  
  *Statutory Authority*:  
  * **Article 21 (危険物等の隔離)**: Fundamental statutory duty of segregation between dangerous goods.  
  * **Article 33 (コンテナ相互の隔離)**: Statutory requirements for segregation within transport units (CTUs) and containers.  
  *(Note: Obsolete secondary literature occasionally cites Arts. 14 and 15; in statutory text, Art. 14 is a bulk container exception and Art. 15 covers overpacks. Substantive segregation duties are strictly codified under Articles 21 and 33).*
* **Nippon Kaiji Kentei Kyokai (NKKK)**:  
  [NKKK Dangerous Goods Inspection and Transport Guidelines](https://www.nkkk.or.jp/business/kikensya/)  
  *Operational Guidelines*: Practical inspection and packing procedures for dangerous goods container loading in Japanese ports.

---

## 7. Runtime Profile & Configuration Options

```typescript
// For non-Japanese trade lanes (omits Japanese domestic statutory citations)
const report = validateSegregation(items, {
  japanKikisonOverlay: false, // Default is true
});
```

### Resource Profile & Execution Guarantees
* **Zero External Dependencies**: Operates with zero network calls, zero external database lookups, and zero filesystem I/O.
* **High Portability**: Bundled as pure TypeScript / ESM, executing in under 1 millisecond on Cloudflare Workers (V8 Isolates), Node.js (18/20/22+), Deno, and modern browser runtimes.
* **Memory Safety & Immutability**: Uses strictly immutable input processing and bounded pairwise iteration, preventing side-effects or memory leakage.

---

## 8. Frequently Asked Questions (FAQ)

**Q. If two incompatible dangerous items are packed into different containers, does it trigger a violation?**  
**A. No.** This engine validates co-loading within the *same* physical container (CTU). Items assigned to distinct `containerNumber`s are physically enclosed separately, returning `PASS`. (Vessel stowage slot-to-slot separation across cell guides and bays is handled by the ocean carrier's stowage planning system).

**Q. Does this validation engine require network connectivity or external database access?**  
**A. Zero external dependencies.** The engine is a self-contained TypeScript module embedding the complete static Table 7.2.4 matrix. It evaluates combinations in microseconds in edge or local environments.

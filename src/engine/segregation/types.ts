/** Cell value from IMDG Code Table 7.2.4 (and Class 1 asterisk). */
export type SegregationCode = "1" | "2" | "3" | "4" | "X" | "*";

/** Aggregate status for a segregation validation report. */
export type SegregationStatus = "PASS" | "WARNING" | "CRITICAL_VIOLATION";

export type SegregationConflict = {
  unNumbers: [string, string];
  properShippingNames: [string, string];
  classes: [string, string];
  containerNumber: string;
  /** Table cell or flashpoint sentinel `"FP"`. */
  requiredSegregation: SegregationCode | "FP";
  /** True when same-CTU ban applies (numeric codes 1–4). */
  violated: boolean;
  message: string;
};

export type SegregationValidationReport = {
  status: SegregationStatus;
  conflicts: SegregationConflict[];
  /** Deduplicated treaty / statutory citations for the report. */
  citations: string[];
};

export type SegregationOptions = {
  /**
   * When true (default), Japanese 危規則 Articles 21 and 33 are included in citations
   * for segregation findings.
   */
  japanKikisonOverlay?: boolean;
};

export {
  hazardsForLookup,
  isClass1Hazard,
  type SegregationTableKey,
  toSegregationTableKey,
} from "./normalize.js";
export {
  lookupSegregation,
  lookupSegregationByClass,
  pickMostStringent,
  segregationTermName,
} from "./table.js";
export type {
  SegregationCode,
  SegregationConflict,
  SegregationOptions,
  SegregationStatus,
  SegregationValidationReport,
} from "./types.js";
export { validateSegregation } from "./validate.js";

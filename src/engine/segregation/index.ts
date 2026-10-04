export type {
  SegregationCode,
  SegregationConflict,
  SegregationOptions,
  SegregationStatus,
  SegregationValidationReport,
} from "./types.js";
export { validateSegregation } from "./validate.js";
export {
  hazardsForLookup,
  isClass1Hazard,
  toSegregationTableKey,
  type SegregationTableKey,
} from "./normalize.js";
export {
  lookupSegregation,
  lookupSegregationByClass,
  pickMostStringent,
  segregationTermName,
} from "./table.js";

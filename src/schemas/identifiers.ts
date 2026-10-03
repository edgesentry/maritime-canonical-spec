import { z } from "zod";
import { isValidImoNumber, normalizeImoNumber } from "../utils/imo-number.js";
import { isValidIso6346ContainerNumber, normalizeContainerNumber } from "../utils/iso6346.js";
import { isValidUnLocode, normalizeUnLocode } from "../utils/unlocode.js";

/** Canonical (normalized) container number shape — used for JSON Schema export. */
export const ContainerNumberNormalizedSchema = z
  .string()
  .regex(/^[A-Z]{4}\d{7}$/, "Container number must be 4 letters + 7 digits (ISO 6346)")
  .refine(isValidIso6346ContainerNumber, "Container number failed ISO 6346 check-digit validation");

/** Canonical (normalized) UN/LOCODE shape — used for JSON Schema export. */
export const UnLocodeNormalizedSchema = z
  .string()
  .regex(
    /^[A-Z]{2}[A-Z0-9]{3}$/,
    "UN/LOCODE must be a 2-letter country code + 3-character location code",
  )
  .refine(isValidUnLocode, "UN/LOCODE must be a 2-letter country code + 3-character location code");

/** Canonical (normalized) IMO number shape — used for JSON Schema export. */
export const ImoNumberNormalizedSchema = z
  .string()
  .regex(/^\d{7}$/, "IMO number must be 7 digits (optional 'IMO' prefix allowed on input)")
  .refine(isValidImoNumber, "IMO number failed check-digit validation");

export const ContainerNumberSchema = z
  .string()
  .transform(normalizeContainerNumber)
  .pipe(ContainerNumberNormalizedSchema);

export const UnLocodeSchema = z
  .string()
  .transform(normalizeUnLocode)
  .pipe(UnLocodeNormalizedSchema);

export const ImoNumberSchema = z
  .string()
  .transform(normalizeImoNumber)
  .pipe(ImoNumberNormalizedSchema);

export type ContainerNumber = z.infer<typeof ContainerNumberSchema>;
export type UnLocode = z.infer<typeof UnLocodeSchema>;
export type ImoNumber = z.infer<typeof ImoNumberSchema>;

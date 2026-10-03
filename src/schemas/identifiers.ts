import { z } from "zod";
import { isValidImoNumber, normalizeImoNumber } from "../utils/imo-number.js";
import { isValidIso6346ContainerNumber, normalizeContainerNumber } from "../utils/iso6346.js";
import { isValidUnLocode, normalizeUnLocode } from "../utils/unlocode.js";

export const ContainerNumberSchema = z
  .string()
  .transform(normalizeContainerNumber)
  .refine(
    (value) => /^[A-Z]{4}\d{7}$/.test(value),
    "Container number must be 4 letters + 7 digits (ISO 6346)",
  )
  .refine(isValidIso6346ContainerNumber, "Container number failed ISO 6346 check-digit validation");

export const UnLocodeSchema = z
  .string()
  .transform(normalizeUnLocode)
  .refine(isValidUnLocode, "UN/LOCODE must be a 2-letter country code + 3-character location code");

export const ImoNumberSchema = z
  .string()
  .transform(normalizeImoNumber)
  .refine(
    (value) => /^\d{7}$/.test(value),
    "IMO number must be 7 digits (optional 'IMO' prefix allowed on input)",
  )
  .refine(isValidImoNumber, "IMO number failed check-digit validation");

export type ContainerNumber = z.infer<typeof ContainerNumberSchema>;
export type UnLocode = z.infer<typeof UnLocodeSchema>;
export type ImoNumber = z.infer<typeof ImoNumberSchema>;

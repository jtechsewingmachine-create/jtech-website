/**
 * Enquiry form contract: fields, allowed values and validation.
 * Shared by the form (client) and, from F-07, mirrored by the Go API — keep both in sync.
 */
import { productBySlug } from "./products"; // relative: also imported by tests outside web/

export const intents = [
  { value: "general", label: "General enquiry" },
  { value: "product", label: "Machine enquiry" },
  { value: "support", label: "Support enquiry" },
  { value: "trade", label: "Trade enquiry" },
] as const;

export type Intent = (typeof intents)[number]["value"];

export interface EnquiryInput {
  name: string;
  phone: string;
  intent: string;
  model: string;
  message: string;
}

export type EnquiryErrors = Partial<Record<keyof EnquiryInput, string>>;

export const LIMITS = { nameMin: 2, nameMax: 80, messageMax: 1000 } as const;

export const isIntent = (v: unknown): v is Intent => intents.some((i) => i.value === v);

/** Indian numbers: 10 digits starting 2-9 (no Indian number starts 0/1 after the prefix),
 *  optionally prefixed +91 / 91 / 0; spaces, dashes and brackets allowed. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "");
  const m = /^(?:\+?91|0)?([2-9]\d{9})$/.exec(digits);
  return m ? m[1] : null;
}

/** Length in characters as people count them (code points), so an emoji counts once. */
export const charCount = (s: string): number => [...s].length;

export function validateEnquiry(input: EnquiryInput): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const name = input.name.trim();
  if (charCount(name) < LIMITS.nameMin) errors.name = "Enter your name.";
  else if (charCount(name) > LIMITS.nameMax) errors.name = `Name must be ${LIMITS.nameMax} characters or fewer.`;

  if (!input.phone.trim()) errors.phone = "Enter a contact number.";
  else if (!normalisePhone(input.phone)) errors.phone = "Enter a 10-digit phone number, for example 98765 43210.";

  if (!isIntent(input.intent)) errors.intent = "Choose what you would like help with.";

  if (input.model && !productBySlug(input.model)) errors.model = "Choose a machine from the list, or no specific machine.";

  if (charCount(input.message) > LIMITS.messageMax)
    errors.message = `Your question must be ${LIMITS.messageMax} characters or fewer (currently ${charCount(input.message)}).`;

  return errors;
}

/** What the confirmation page may show. Never holds the visitor's name or number. */
export interface ConfirmationContext {
  intentLabel: string;
  modelName: string | null;
}

export const CONFIRMATION_KEY = "jtech-enquiry-confirmation";

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CONFIRMATION_KEY,
  LIMITS,
  intents,
  validateEnquiry,
  type ConfirmationContext,
  type EnquiryErrors,
  type EnquiryInput,
} from "@/lib/enquiry";

type ModelOption = { slug: string; name: string };
type Status = "idle" | "submitting" | "failed";

const FIELD_ORDER: (keyof EnquiryInput)[] = ["name", "phone", "intent", "model", "message"];

/**
 * shortcut: submission is simulated in the browser (blueprint: no live enquiries yet).
 * It fails only when the browser is offline, so the failure state is real and testable.
 * F-07 replaces simulateSubmit with a call to the Go API.
 */
async function simulateSubmit(): Promise<void> {
  await new Promise((r) => setTimeout(r, 600));
  if (!navigator.onLine) throw new Error("offline");
}

export function EnquiryForm({
  models,
  initial,
}: {
  models: ModelOption[];
  initial: Pick<EnquiryInput, "intent" | "model">;
}) {
  const router = useRouter();
  const [values, setValues] = useState<EnquiryInput>({ name: "", phone: "", message: "", ...initial });
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  // Until hydrated, a native submit would bypass validation; keep the button inert until then.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const summaryRef = useRef<HTMLDivElement>(null);
  const failRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof EnquiryInput) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hydrated || status === "submitting") return; // pre-hydration + double-submit guard
    const found = validateEnquiry(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus("idle");
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStatus("submitting");
    try {
      await simulateSubmit();
    } catch {
      setStatus("failed");
      requestAnimationFrame(() => failRef.current?.focus());
      return;
    }
    const ctx: ConfirmationContext = {
      intentLabel: intents.find((i) => i.value === values.intent)?.label ?? "Enquiry",
      modelName: models.find((m) => m.slug === values.model)?.name ?? null,
    };
    try {
      sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(ctx));
    } catch {
      // Storage blocked: the confirmation page shows its missing-context state instead.
    }
    router.push("/enquiry/confirmation");
  }

  const errorIds = FIELD_ORDER.filter((k) => errors[k]);
  const describe = (k: keyof EnquiryInput, hint?: string) =>
    [hint, errors[k] ? `${k}-error` : null].filter(Boolean).join(" ") || undefined;

  // method=post: a native submit must never put name/number into the URL.
  return (
    <form className="form" method="post" onSubmit={onSubmit} noValidate aria-describedby="form-notice">
      <p id="form-notice" className="notice">
        <strong>Prototype:</strong> this form is a simulation. Nothing you enter is sent or stored.
      </p>

      {errorIds.length > 0 && (
        <div className="error-summary" ref={summaryRef} tabIndex={-1} role="alert">
          <h2>Check the highlighted fields</h2>
          <ul>
            {errorIds.map((k) => (
              <li key={k}>
                <a href={`#${k}`}>{errors[k]}</a>
              </li>
            ))}
          </ul>
          <p>
            Need help? <Link href="/support">View contact guidance</Link>.
          </p>
        </div>
      )}

      {status === "failed" && (
        <div className="error-summary" ref={failRef} tabIndex={-1} role="alert">
          <h2>The enquiry could not be completed</h2>
          <p>Your entries are still here. Check your connection and try again.</p>
          <div className="link-row">
            <button type="submit" className="btn btn--primary">
              Retry
            </button>
            <Link href="/support" className="btn">
              Contact support
            </Link>
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="name">
          Name <span className="req">(required)</span>
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          maxLength={LIMITS.nameMax + 20}
          value={values.name}
          onChange={set("name")}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describe("name")}
        />
        {errors.name && <p id="name-error" className="field__error">{errors.name}</p>}
      </div>

      <div className="field">
        <label htmlFor="phone">
          Contact number <span className="req">(required)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={set("phone")}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={describe("phone", "phone-hint")}
        />
        <p id="phone-hint" className="field__hint">
          The Jtech team would follow up by phone or messaging.
        </p>
        {errors.phone && <p id="phone-error" className="field__error">{errors.phone}</p>}
      </div>

      <div className="field">
        <label htmlFor="intent">
          What would you like help with? <span className="req">(required)</span>
        </label>
        <select
          id="intent"
          name="intent"
          value={values.intent}
          onChange={set("intent")}
          aria-invalid={errors.intent ? true : undefined}
          aria-describedby={describe("intent")}
        >
          <option value="">Choose one</option>
          {intents.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        {errors.intent && <p id="intent-error" className="field__error">{errors.intent}</p>}
      </div>

      <div className="field">
        <label htmlFor="model">Machine (optional)</label>
        <select
          id="model"
          name="model"
          value={values.model}
          onChange={set("model")}
          aria-invalid={errors.model ? true : undefined}
          aria-describedby={describe("model")}
        >
          <option value="">No specific machine</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>
        {errors.model && <p id="model-error" className="field__error">{errors.model}</p>}
      </div>

      <div className="field">
        <label htmlFor="message">Your question or intended use (optional)</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={values.message}
          onChange={set("message")}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describe("message", "message-hint")}
        />
        <p id="message-hint" className="field__hint">
          For example, what you would like to sew, or your town if you are asking about service near you.
          Up to {LIMITS.messageMax} characters.
        </p>
        {errors.message && <p id="message-error" className="field__error">{errors.message}</p>}
      </div>

      <button type="submit" className="btn btn--primary" disabled={!hydrated} aria-disabled={status === "submitting" ? true : undefined}>
        {status === "submitting" ? "Sending…" : "Submit simulated enquiry"}
      </button>
      <noscript>
        <p className="field__hint">This form needs JavaScript. You can still find contact guidance on the support page.</p>
      </noscript>
      <p className="visually-hidden" role="status">
        {status === "submitting" ? "Submitting your enquiry" : ""}
      </p>
    </form>
  );
}

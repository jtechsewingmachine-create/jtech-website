"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CONFIRMATION_KEY, type ConfirmationContext } from "@/lib/enquiry";

// Read once and clear it, so a reload or later visit shows the missing-context state.
function takeContext(): ConfirmationContext | null {
  try {
    const raw = sessionStorage.getItem(CONFIRMATION_KEY);
    sessionStorage.removeItem(CONFIRMATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConfirmationContext>;
    if (typeof parsed.intentLabel !== "string") return null;
    return { intentLabel: parsed.intentLabel, modelName: typeof parsed.modelName === "string" ? parsed.modelName : null };
  } catch {
    return null;
  }
}

/** Success panel when the form left context in sessionStorage; missing-context state otherwise. */
export function ConfirmationDetails() {
  const [ctx, setCtx] = useState<ConfirmationContext | null | undefined>(undefined);

  // Per mounted instance: survives StrictMode's double effect, resets on every new visit.
  const taken = useRef<ConfirmationContext | null | undefined>(undefined);
  useEffect(() => {
    if (taken.current === undefined) taken.current = takeContext();
    setCtx(taken.current);
  }, []);

  if (ctx === undefined) return <p className="small">Loading confirmation details…</p>;

  if (ctx === null) {
    return (
      <div className="empty-state">
        <h2>No confirmation details are available.</h2>
        <p>Return to the enquiry or browse the demo machines.</p>
        <div className="link-row link-row--center">
          <Link href="/enquiry" className="btn btn--primary">
            Return to enquiry
          </Link>
          <Link href="/machines" className="btn">
            Browse machines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation__success">
      <h2>
        Simulation <span className="accent">complete</span>
      </h2>
      <p className="lede">
        No enquiry was sent and no order was placed. In the live website, the Jtech team would follow up
        by phone or messaging.
      </p>
    <dl className="facts confirmation__facts">
      <div>
        <dt>Enquiry type</dt>
        <dd>{ctx.intentLabel}</dd>
      </div>
      <div>
        <dt>Machine</dt>
        <dd>{ctx.modelName ?? "No specific machine"}</dd>
      </div>
    </dl>
      <Link href="/machines" className="link-arrow">
        Continue browsing
      </Link>
    </div>
  );
}

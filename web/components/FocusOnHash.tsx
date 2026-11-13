"use client";

import { useEffect } from "react";

/**
 * Moves keyboard focus to the element whose id matches `id` when the page is
 * opened at, or a link jumps to, `#id`. Scrolling is left to the browser (which
 * already honours scroll-padding and reduced motion); this only fixes focus,
 * which anchors alone do not move (blueprint: Choosing Help focus finding).
 */
export function FocusOnHash({ id }: { id: string }) {
  useEffect(() => {
    const focus = () => document.getElementById(id)?.focus({ preventScroll: true });
    if (location.hash === `#${id}`) focus();

    // Same-page jumps: Next's <Link> uses pushState, which fires no hashchange.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (a && a.hash === `#${id}` && a.pathname === location.pathname) setTimeout(focus, 0);
    };
    window.addEventListener("hashchange", focus);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", focus);
      document.removeEventListener("click", onClick);
    };
  }, [id]);
  return null;
}

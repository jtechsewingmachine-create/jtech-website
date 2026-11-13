"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Click-to-play clip with one Play/Pause button (blueprint media_playing / media_paused).
 * Never autoplays; the poster is the still fallback, and the server-rendered caption
 * outside this component carries the text equivalent. Before hydration (or without JS)
 * the browser's native controls are shown instead, so the clip is never inert.
 */
export function DemoVideo({ src, poster, describedBy }: { src: string; poster: string; describedBy: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => setHydrated(true), []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    // Pausing before playback starts rejects play() with AbortError: that is the visitor's choice, not a failure.
    if (v.paused) v.play().catch((err: unknown) => {
      if ((err as { name?: string })?.name !== "AbortError") setFailed(true);
    });
    else v.pause();
  };

  return (
    <div className="video__frame">
      <video
        ref={ref}
        controls={!hydrated}
        muted
        playsInline
        preload="none"
        poster={poster}
        width={1920}
        height={1080}
        aria-describedby={describedBy}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        {/* A failing <source> fires error on itself, not on <video>. */}
        <source src={src} type="video/mp4" onError={() => setFailed(true)} />
      </video>
      {hydrated &&
        (failed ? (
          <p className="video__status" role="status">
            The video could not play. The still image and description remain available.
          </p>
        ) : (
          <button type="button" className="video__toggle" onClick={toggle}>
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
            {playing ? "Pause video" : "Play video"}
          </button>
        ))}
    </div>
  );
}

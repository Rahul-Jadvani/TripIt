"use client";

import React, { useEffect, useState } from "react";

/**
 * Page Scroll Background Component - CSS-only version
 *
 * Renders animated gradient blobs using CSS instead of framer-motion
 * - No JavaScript animation runtime
 * - Respects prefers-reduced-motion
 * - Saves ~40KB framer-motion bundle size
 * - Fixed positioning to stay behind content
 * - z-index: 0 to stay behind all content
 */
const PageScrollBackground = () => {
  // Respect user's reduced-motion preference
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    try {
      const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      setReducedMotion(!!m && m.matches);
    } catch {}
  }, []);

  // Skip animation entirely if reduced motion is preferred
  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />

        {/* Static blobs */}
        <div className="absolute -top-[10%] -left-[10%] h-[45vw] w-[45vw] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-[15%] -right-[5%] h-[40vw] w-[40vw] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-[20%] right-[20%] h-[28vw] w-[28vw] rounded-full bg-primary/10 blur-3xl" />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Vignette to improve contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />

      {/* Animated blobs using CSS keyframes */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(10px, 20px); }
          50% { transform: translate(5px, 40px); }
          75% { transform: translate(-10px, 20px); }
        }

        @keyframes float-fast {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-15px, -30px); }
          50% { transform: translate(-20px, -50px); }
          75% { transform: translate(-10px, -30px); }
        }

        .blob-slow {
          animation: float-slow 20s ease-in-out infinite;
          will-change: transform;
        }

        .blob-fast {
          animation: float-fast 15s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      {/* Top-left blob - slow animation */}
      <div className="blob-slow absolute -top-[10%] -left-[10%] h-[45vw] w-[45vw] rounded-full bg-primary/15 blur-3xl" />

      {/* Bottom-right blob - fast animation */}
      <div className="blob-fast absolute -bottom-[15%] -right-[5%] h-[40vw] w-[40vw] rounded-full bg-accent/20 blur-3xl" />

      {/* Mid-right blob - slow animation */}
      <div className="blob-slow absolute top-[20%] right-[20%] h-[28vw] w-[28vw] rounded-full bg-primary/10 blur-3xl" />
    </div>
  );
};

export { PageScrollBackground };

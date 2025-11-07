"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";

const PageScrollBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  // Respect user's reduced-motion preference
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    try {
      const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      setReducedMotion(!!m && m.matches);
    } catch {}
  }, []);

  // Subtle parallax transforms (GPU-friendly: translate only)
  const ySlow = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const xSlow = useTransform(scrollYProgress, [0, 1], [0, 30]);
  const yFast = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const xFast = useTransform(scrollYProgress, [0, 1], [0, -20]);

  // Static fallback values when reduced motion is enabled
  const staticTransform = useMemo(() => ({ x: 0, y: 0 }), []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Subtle vignette to improve contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />

      {/* Blurred color blobs moving slightly with scroll */}
      {/* Top-left blob */}
      {reducedMotion ? (
        <div className="absolute -top-[10%] -left-[10%] h-[45vw] w-[45vw] rounded-full bg-primary/15 blur-3xl" />
      ) : (
        <motion.div
          className="absolute -top-[10%] -left-[10%] h-[45vw] w-[45vw] rounded-full bg-primary/15 blur-3xl will-change-transform"
          style={{ x: xSlow, y: ySlow }}
        />
      )}

      {/* Bottom-right blob */}
      {reducedMotion ? (
        <div className="absolute -bottom-[15%] -right-[5%] h-[40vw] w-[40vw] rounded-full bg-accent/20 blur-3xl" />
      ) : (
        <motion.div
          className="absolute -bottom-[15%] -right-[5%] h-[40vw] w-[40vw] rounded-full bg-accent/20 blur-3xl will-change-transform"
          style={{ x: xFast, y: yFast }}
        />
      )}

      {/* Mid-right subtle glow */}
      {reducedMotion ? (
        <div className="absolute top-[20%] right-[20%] h-[28vw] w-[28vw] rounded-full bg-primary/10 blur-3xl" />
      ) : (
        <motion.div
          className="absolute top-[20%] right-[20%] h-[28vw] w-[28vw] rounded-full bg-primary/10 blur-3xl will-change-transform"
          style={{ x: xSlow, y: yFast }}
        />
      )}
    </div>
  );
};

export { PageScrollBackground };

/**
 * Page Scroll Background Component
 *
 * Renders an animated SVG stroke that follows page scroll progress.
 * - Fixed positioning to stay in viewport
 * - Tracks page scroll with useScroll
 * - z-index: 0 to stay behind all content
 * - Based on InteractiveScrollBackground design
 */

"use client";

import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";

interface CrowdCanvasProps {
  src: string;
  rows?: number;
  cols?: number;
  active?: boolean; // controls whether animation runs
}

const CrowdCanvas = ({ src, rows = 15, cols = 7, active = true }: CrowdCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reduce particle count on small screens
    const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    const deviceRows = isMobile ? Math.max(3, Math.floor(rows * 0.25)) : rows;
    const deviceCols = isMobile ? Math.max(2, Math.floor(cols * 0.25)) : cols;

    const config = {
      src,
      rows: deviceRows,
      cols: deviceCols,
    };

    // UTILS
    const randomRange = (min: number, max: number) =>
      min + Math.random() * (max - min);
    const randomIndex = (array: any[]) => randomRange(0, array.length) | 0;
    const removeFromArray = (array: any[], i: number) => array.splice(i, 1)[0];
    const removeItemFromArray = (array: any[], item: any) =>
      removeFromArray(array, array.indexOf(item));
    const removeRandomFromArray = (array: any[]) =>
      removeFromArray(array, randomIndex(array));
    const getRandomFromArray = (array: any[]) => array[randomIndex(array) | 0];

    // TWEEN FACTORIES
    const resetPeep = ({ stage, peep }: { stage: any; peep: any }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      // On mobile, position in two rows; on desktop, spread them out
      let offsetY: number;
      if (isMobile) {
        // Use sprite row to determine canvas row (top or bottom)
        const spriteRow = Math.floor(peep.rect[1] / peep.rect[3]);
        // Alternate between two row positions - both at bottom to avoid top visibility
        offsetY = spriteRow % 2 === 0 ? 30 : 70;
      } else {
        offsetY = 100 - 250 * gsap.parseEase("power2.in")(Math.random());
      }
      const startY = stage.height - peep.height + offsetY;
      let startX: number;
      let endX: number;

      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = 0;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;

      return {
        startX,
        startY,
        endX,
      };
    };

    const normalWalk = ({ peep, props }: { peep: any; props: any }) => {
      const { startX, startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.25;

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(
        peep,
        {
          duration: xDuration,
          x: endX,
          ease: "none",
        },
        0,
      );
      tl.to(
        peep,
        {
          duration: yDuration,
          repeat: xDuration / yDuration,
          yoyo: true,
          y: startY - 10,
        },
        0,
      );

      return tl;
    };

    const walks = [normalWalk];

    // TYPES
    type Peep = {
      image: HTMLImageElement;
      rect: number[];
      width: number;
      height: number;
      drawArgs: any[];
      x: number;
      y: number;
      anchorY: number;
      scaleX: number;
      walk: any;
      setRect: (rect: number[]) => void;
      render: (ctx: CanvasRenderingContext2D) => void;
    };

    // FACTORY FUNCTIONS
    const createPeep = ({
      image,
      rect,
    }: {
      image: HTMLImageElement;
      rect: number[];
    }): Peep => {
      const peep: Peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        drawArgs: [],
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        walk: null,
        setRect: (rect: number[]) => {
          peep.rect = rect;
          peep.width = rect[2];
          peep.height = rect[3];
          peep.drawArgs = [peep.image, ...rect, 0, 0, peep.width, peep.height];
        },
        render: (ctx: CanvasRenderingContext2D) => {
          ctx.save();
          ctx.translate(peep.x, peep.y);
          ctx.scale(peep.scaleX, 1);
          ctx.drawImage(
            peep.image,
            peep.rect[0],
            peep.rect[1],
            peep.rect[2],
            peep.rect[3],
            0,
            0,
            peep.width,
            peep.height,
          );
          ctx.restore();
        },
      };

      peep.setRect(rect);
      return peep;
    };

    // MAIN
    const stage = {
      width: 0,
      height: 0,
    };

    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    const createPeeps = (image: HTMLImageElement) => {
      const { rows, cols } = config;
      const { naturalWidth: width, naturalHeight: height } = image;
      const total = rows * cols;
      const rectWidth = width / rows;
      const rectHeight = height / cols;

      for (let i = 0; i < total; i++) {
        allPeeps.push(
          createPeep({
            image: image,
            rect: [
              (i % rows) * rectWidth,
              ((i / rows) | 0) * rectHeight,
              rectWidth,
              rectHeight,
            ],
          }),
        );
      }
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        addPeepToCrowd().walk.progress(Math.random());
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({
          peep,
          stage,
        }),
      }).eventCallback("onComplete", () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });

      peep.walk = walk;

      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);

      return peep;
    };

    const removePeepFromCrowd = (peep: Peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const render = () => {
      if (!canvas) return;

      // Fill darker background to reduce overall brightness
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      crowd.forEach((peep) => {
        peep.render(ctx);
      });

      // Apply subtler yellow overlay to reduce visual clutter/brightness
      ctx.fillStyle = 'rgba(255, 200, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      stage.width = rect.width;
      stage.height = rect.height;
      canvas.width = stage.width;
      canvas.height = stage.height;

      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });

      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);

      initCrowd();
    };

    const img = document.createElement("img");

    const init = () => {
      createPeeps(img);
      resize();
      gsap.ticker.add(render);
    };

    // Try local assets first, then fallback to S3
    const s3Fallback = "https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/open-peeps-sheet.png";
    const candidates = Array.from(
      new Set([
        src || "/assets/open-peeps-sheet.png",
        "/assets/open-peeps-sheet.png",
        "/open-peeps-sheet.png",
        s3Fallback,
      ])
    );
    let idx = 0;
    const tryNext = () => {
      if (idx >= candidates.length) return;
      img.src = candidates[idx++];
    };

    img.onload = init;
    img.onerror = tryNext;
    tryNext();

    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      gsap.ticker.remove(render);
      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });
    };
  }, [src, rows, cols, active]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full bg-gray-900"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
};

const Skiper39 = ({ active = true }: { active?: boolean }) => {
  return (
    <div className="relative h-full w-full bg-gray-900 text-orange-500">
      {/* Background ZERO watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <div
          className="text-9xl font-black opacity-10"
          style={{
            fontFamily: '"Comic Relief", system-ui',
            fontWeight: 700,
            color: '#fbbf24',
            transform: 'rotate(-15deg)',
            whiteSpace: 'nowrap'
          }}
        >
          ZERO
        </div>
      </div>

      <div className="top-22 absolute left-1/2 grid -translate-x-1/2 content-start justify-items-center gap-6 text-center text-orange-500 z-10">
        <span className="relative max-w-[12ch] text-xs uppercase leading-tight opacity-60 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-orange-500 after:to-gray-900 after:content-['']">
          Croud Canvas
        </span>
      </div>

      {/* Demo badges overlay (uses new badge classes) */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap gap-2">
        <div className="badge badge-dash badge-primary">Primary</div>
        <div className="badge badge-dash badge-secondary">Secondary</div>
        <div className="badge badge-dash badge-accent">Accent</div>
        <div className="badge badge-dash badge-info">Info</div>
        <div className="badge badge-dash badge-success">Success</div>
        <div className="badge badge-dash badge-warning">Warning</div>
        <div className="badge badge-dash badge-error">Error</div>
      </div>
      <div className="absolute bottom-0 h-full w-screen z-20">
        <CrowdCanvas active={active} src="/assets/open-peeps-sheet.png" rows={15} cols={7} />
      </div>
    </div>
  );
};

export { CrowdCanvas, Skiper39 };

/**
 * Skiper 39 Canvas_Landing_004 — React + Canvas
 * Inspired by and adapted from https://codepen.io/zadvorsky/pen/xxwbBQV
 * illustration by https://www.openpeeps.com/
 * We respect the original creators. This is an inspired rebuild with our own taste and does not claim any ownership.
 * These animations aren't associated with the codepen.io . They're independent recreations meant to study interaction design
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.in
 * Twitter: https://x.com/Gur__vi
 */

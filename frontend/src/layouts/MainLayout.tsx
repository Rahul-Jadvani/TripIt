import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Skiper39 } from '@/components/CrowdCanvas';
import { useEffect, useRef, useState } from 'react';

export function MainLayout() {
  const [animVisible, setAnimVisible] = useState(false);
  const animRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = animRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setAnimVisible(true);
        } else {
          setAnimVisible(false);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col" style={{ zIndex: 10, position: "relative" }}>
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>

      {/* Separator above footer */}
      <div className="mx-4 sm:mx-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-8" />
      </div>

      {/* Footer and Crowd Animation Merged Section */}
      <div className="mx-4 sm:mx-6 mt-6 mb-2 pt-6 pb-12">
        <div className="relative">
          {/* Mascot positioned on the footer line. Duplicate with small offset to hide restart gap on some GIFs. */}
          <FooterMascot />

          <div className="relative bg-black rounded-2xl border-4 border-border overflow-hidden">
          {/* Footer Content */}
          <Footer />

          {/* Crowd Animation - Merged Below Footer */}
          <div ref={animRef} className="relative w-full h-72 sm:h-80 overflow-hidden bg-gradient-to-t from-black/80 to-transparent">
            {/* Dark overlay to reduce visual clutter/brightness */}
            <div className="absolute inset-0 z-30 pointer-events-none bg-black/40" />
            {animVisible && <Skiper39 active />}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterMascot() {
  const [useGif, setUseGif] = useState(false);
  const containerClass = "pointer-events-none select-none absolute top-0 right-2 sm:right-4 -translate-y-[85%] w-28 sm:w-40 md:w-56 lg:w-64 z-40 drop-shadow-[3px_4px_0_rgba(0,0,0,0.6)]";

  // If video fails to load on device, fall back to GIF
  const handleVideoError = () => setUseGif(true);

  return (
    <div className={containerClass}>
      {!useGif ? (
        <video
          key="footer-video"
          className="block w-full h-auto"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/assets/leaderboard.png"
          onError={handleVideoError}
        >
          <source src="/assets/Untitleddesign2-ezgif.com-gif-maker.webm" type="video/webm" />
          <source src="/assets/Untitleddesign2-ezgif.com-gif-maker.mp4" type="video/mp4" />
        </video>
      ) : (
        // GIF fallback (may show a tiny restart gap on some browsers)
        <img
          src="/assets/Untitleddesign2-ezgif.com-gif-maker.gif"
          alt="footer character"
          className="block w-full h-auto"
        />
      )}
    </div>
  );
}

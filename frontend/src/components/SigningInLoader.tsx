import React from 'react';

interface SigningInLoaderProps {
  message?: string;
}

export function SigningInLoader({ message = 'Signing you in...' }: SigningInLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-5">
          <div className="cube-spinner">
            <div />
            <div />
            <div />
            <div />
          <div />
          <div />
        </div>
        <p className="text-white font-semibold text-sm sm:text-base">{message}</p>
      </div>
      <style>{`
        .cube-spinner {
          position: relative;
          width: 70.4px;
          height: 70.4px;
          --clr: #FACC15;
          --clr-alpha: rgba(250, 204, 21, 0.12);
          animation: cube-spin 1.6s infinite ease;
          transform-style: preserve-3d;
        }
        .cube-spinner > div {
          background-color: var(--clr-alpha);
          height: 100%;
          position: absolute;
          width: 100%;
          border: 3.5px solid var(--clr);
          box-shadow: 0 0 12px rgba(250, 204, 21, 0.25);
          border-radius: 6px;
        }
        .cube-spinner div:nth-of-type(1) { transform: translateZ(-35.2px) rotateY(180deg); }
        .cube-spinner div:nth-of-type(2) { transform: rotateY(-270deg) translateX(50%); transform-origin: top right; }
        .cube-spinner div:nth-of-type(3) { transform: rotateY(270deg) translateX(-50%); transform-origin: center left; }
        .cube-spinner div:nth-of-type(4) { transform: rotateX(90deg) translateY(-50%); transform-origin: top center; }
        .cube-spinner div:nth-of-type(5) { transform: rotateX(-90deg) translateY(50%); transform-origin: bottom center; }
        .cube-spinner div:nth-of-type(6) { transform: translateZ(35.2px); }
        @keyframes cube-spin {
          0% { transform: rotate(45deg) rotateX(-25deg) rotateY(25deg); }
          50% { transform: rotate(45deg) rotateX(-385deg) rotateY(25deg); }
          100% { transform: rotate(45deg) rotateX(-385deg) rotateY(385deg); }
        }
      `}</style>
    </div>
  );
}

export default SigningInLoader;

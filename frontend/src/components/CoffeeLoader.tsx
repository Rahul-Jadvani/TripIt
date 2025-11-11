import React, { useState, useEffect } from 'react';
import { getRandomCaption } from '@/utils/loadingCaptions';

type CaptionCategory = 'general' | 'validator' | 'admin' | 'profile' | 'projects';

type Props = {
  message?: string;
  captionCategory?: CaptionCategory;
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
  showRandomCaption?: boolean;
};

export const CoffeeLoader: React.FC<Props> = ({
  message,
  captionCategory = 'general',
  size = 'md',
  overlay = false,
  showRandomCaption = true,
}) => {
  const [displayMessage, setDisplayMessage] = useState<string>(
    message || (showRandomCaption ? getRandomCaption(captionCategory) : 'Enjoy coffee while we load')
  );

  // Update message periodically for variety
  useEffect(() => {
    if (!showRandomCaption) return;

    const interval = setInterval(() => {
      setDisplayMessage(getRandomCaption(captionCategory));
    }, 5000); // Change caption every 5 seconds

    return () => clearInterval(interval);
  }, [showRandomCaption, captionCategory]);
  const scale = size === 'sm' ? 0.6 : size === 'lg' ? 1.1 : 0.85;
  const wrapperClass = overlay
    ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center';

  return (
    <div className={wrapperClass} role="status" aria-live="polite">
      <div className="coffee-loader" style={{ transform: `scale(${scale})` }}>
        <div className="container">
          <div className="coffee-header">
            <div className="coffee-header__buttons coffee-header__button-one" />
            <div className="coffee-header__buttons coffee-header__button-two" />
            <div className="coffee-header__display" />
            <div className="coffee-header__details" />
          </div>
          <div className="coffee-medium">
            <div className="coffe-medium__exit" />
            <div className="coffee-medium__arm" />
            <div className="coffee-medium__liquid" />
            <div className="coffee-medium__smoke coffee-medium__smoke-one" />
            <div className="coffee-medium__smoke coffee-medium__smoke-two" />
            <div className="coffee-medium__smoke coffee-medium__smoke-three" />
            <div className="coffee-medium__smoke coffee-medium__smoke-for" />
            <div className="coffee-medium__cup" />
          </div>
          <div className="coffee-footer" />
        </div>
      </div>
      {displayMessage && (
        <p className="mt-6 text-sm font-semibold text-foreground text-center">
          {displayMessage}
        </p>
      )}
    </div>
  );
};

export default CoffeeLoader;

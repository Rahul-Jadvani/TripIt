import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CoffeeLoader } from './CoffeeLoader';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';

const MESSAGES = [
  'Just a moment — projects are brewing…',
  'Grinding beans and fetching data…',
  'Pouring a fresh stream of projects…',
  'Your latte is almost ready…',
  'Steeping the latest updates…',
  'Heating up the leaderboard…',
  'Roasting ideas to perfection…',
  'Dialing in the perfect blend…',
  'Pulling a fresh shot of innovation…',
];

export const FirstOpenLoader: React.FC = () => {
  const [show, setShow] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const startRef = useRef<number | null>(null);
  const isFetching = useIsFetching();
  const queryClient = useQueryClient();
  const message = useMemo(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)], []);

  useEffect(() => {
    const key = 'first_open_done';
    const has = localStorage.getItem(key);
    if (!has) {
      setShow(true);
      startRef.current = Date.now();
      const minTimer = setTimeout(() => setMinElapsed(true), 1200);
      return () => {
        clearTimeout(minTimer);
      };
    }
  }, []);

  // Consider feed "ready" when critical queries are fulfilled in cache
  const criticalReady = (() => {
    const trending = queryClient.getQueryState(['projects', 'trending', 1]);
    const topRated = queryClient.getQueryState(['projects', 'top-rated', 1]);
    // Match page logic: trending and top-rated loaded is enough to render main content
    const ok = (q: any) => q && q.status === 'success';
    return ok(trending) && ok(topRated);
  })();

  // Hide when both: minimum delay passed and critical data ready
  useEffect(() => {
    const key = 'first_open_done';
    if (show && minElapsed && criticalReady) {
      setShow(false);
      localStorage.setItem(key, '1');
    }
  }, [show, minElapsed, criticalReady]);

  if (!show) return null;
  return <CoffeeLoader overlay size="md" message={message} />;
};

export default FirstOpenLoader;

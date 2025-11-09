import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CoffeeLoader } from './CoffeeLoader';
import { useIsFetching } from '@tanstack/react-query';

const MESSAGES = [
  'Enjoy coffee while we brew your feed…',
  'Grinding beans and fetching data…',
  'Pouring a fresh stream of projects…',
  'Your latte is almost ready…',
];

export const FirstOpenLoader: React.FC = () => {
  const [show, setShow] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const startRef = useRef<number | null>(null);
  const isFetching = useIsFetching();
  const message = useMemo(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)], []);

  useEffect(() => {
    const key = 'first_open_done';
    const has = localStorage.getItem(key);
    if (!has) {
      setShow(true);
      startRef.current = Date.now();
      const minTimer = setTimeout(() => setMinElapsed(true), 1200);
      const maxTimer = setTimeout(() => {
        setShow(false);
        localStorage.setItem(key, '1');
      }, 6000);
      return () => {
        clearTimeout(minTimer);
        clearTimeout(maxTimer);
      };
    }
  }, []);

  // Hide when both: minimum delay passed and no active fetches
  useEffect(() => {
    const key = 'first_open_done';
    if (show && minElapsed && isFetching === 0) {
      setShow(false);
      localStorage.setItem(key, '1');
    }
  }, [show, minElapsed, isFetching]);

  if (!show) return null;
  return <CoffeeLoader overlay size="md" message={message} />;
};

export default FirstOpenLoader;

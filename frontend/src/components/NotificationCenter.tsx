import React, { useEffect, useState } from 'react';
import { subscribeNotice, Notice } from '@/lib/notifications';

// UI host subscribes to notification bus

export function NotificationCenterHost() {
  const [items, setItems] = useState<Notice[]>([]);

  useEffect(() => {
    return subscribeNotice((n: Notice) => {
      setItems((prev) => [...prev, n]);
      const timeout = n.duration ?? 4000;
      if (timeout > 0) {
        setTimeout(() => {
          setItems((prev) => prev.filter((i) => i.id !== n.id));
        }, timeout);
      }
    });
  }, []);

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div>
      <ul className="notification-container">
        {items.map((n) => (
          <li key={n.id} className={`notification-item ${n.type !== 'default' ? n.type : ''}`}>
            <div className="notification-content">
              <div className="notification-icon">
                {n.type === 'success' && (
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 11.5 11 14l4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                {n.type === 'info' && (
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                {n.type === 'warning' && (
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                {n.type === 'error' && (
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 9-6 6m0-6 6 6m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                {n.type === 'default' && (
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13v-2a1 1 0 0 0-1-1h-.757l-.707-1.707.535-.536a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0l-.536.535L14 4.757V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v.757l-1.707.707-.536-.535a1 1 0 0 0-1.414 0L4.929 6.343a1 1 0 0 0 0 1.414l.536.536L4.757 10H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.757l.707 1.707-.535.536a1 1 0 0 0 0 1.414l1.414 1.414a1 1 0 0 0 1.414 0l.536-.535 1.707.707V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-.757l1.707-.708.536.536a1 1 0 0 0 1.414 0l1.414-1.414a1 1 0 0 0 0-1.414l-.535-.536.707-1.707H20a1 1 0 0 0 1-1Z" />
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                )}
              </div>
              <div className="notification-text">{n.text}</div>
            </div>
            <button className="notification-icon notification-close" onClick={() => remove(n.id)} aria-label="Close notification">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 17.94 6M18 18 6.06 6" />
              </svg>
            </button>
            <div className="notification-progress-bar" />
          </li>
        ))}
      </ul>
      <style>{`
  .notification-container {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1000;
    max-width: min(420px, 90vw);
    display: flex;
    flex-direction: column;
    gap: 8px;
    list-style-type: none;
    color: black;
  }
  .notification-item {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    overflow: hidden;
    padding: 10px 12px;
    border-radius: 10px;
    box-shadow: rgba(0, 0, 0, 0.25) 0px 8px 0px;
    background-color: #f3f3f3;
    transition: all 250ms ease;
    border: 3px solid black;
    --grid-color: rgba(225, 225, 225, 0.7);
    background-image: linear-gradient(
        0deg,
        transparent 23%,
        var(--grid-color) 24%,
        var(--grid-color) 25%,
        transparent 26%,
        transparent 73%,
        var(--grid-color) 74%,
        var(--grid-color) 75%,
        transparent 76%,
        transparent
      ),
      linear-gradient(
        90deg,
        transparent 23%,
        var(--grid-color) 24%,
        var(--grid-color) 25%,
        transparent 26%,
        transparent 73%,
        var(--grid-color) 74%,
        var(--grid-color) 75%,
        transparent 76%,
        transparent
      );
    background-size: 55px 55px;
  }
  .notification-item:hover { transform: translateY(-1px); }
  .notification-item:active { transform: translateY(-2px); }
  .notification-item .notification-close { padding: 2px; border-radius: 6px; transition: all 250ms; background: transparent; border: none; }
  .notification-item .notification-close:hover { background-color: rgba(204, 204, 204, 0.45); }
  .notification-item .notification-close:hover svg { color: rgb(0, 0, 0); }
  .notification-item svg { width: 16px; height: 16px; color: inherit; }
  .notification-icon { display: flex; align-items: center; }
  .notification-content { display: flex; align-items: center; gap: 8px; }
  .notification-text { font-size: 0.85rem; font-weight: 600; }
  .notification-progress-bar { position: absolute; bottom: 0; left: 0; height: 2px; background: currentColor; width: 100%; animation: progressBar 4s linear forwards; }

  .success { color: #047857; background-color: #7dffbc; --grid-color: rgba(16, 185, 129, 0.25); }
  .info { color: #1e3a8a; background-color: #7eb8ff; --grid-color: rgba(59, 131, 246, 0.25); }
  .warning { color: #78350f; background-color: #ffe57e; --grid-color: rgba(245, 159, 11, 0.25); }
  .error { color: #7f1d1d; background-color: #ff7e7e; --grid-color: rgba(239, 68, 68, 0.25); }

  @keyframes progressBar { from { transform: translateX(0); } to { transform: translateX(-100%); } }
      `}</style>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { subscribeNotice, Notice } from '@/lib/notifications';
import styles from './NotificationCenter.module.css';

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

  const getNotificationClass = (type: string) => {
    switch (type) {
      case 'success':
        return styles.success;
      case 'info':
        return styles.info;
      case 'warning':
        return styles.warning;
      case 'error':
        return styles.error;
      default:
        return '';
    }
  };

  return (
    <div>
      <ul className={styles.notificationContainer}>
        {items.map((n) => (
          <li key={n.id} className={`${styles.notificationItem} ${getNotificationClass(n.type)}`}>
            <div className={styles.notificationContent}>
              <div className={styles.notificationIcon}>
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
              <div className={styles.notificationText}>{n.text}</div>
            </div>
            <button className={`${styles.notificationIcon} ${styles.notificationClose}`} onClick={() => remove(n.id)} aria-label="Close notification">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 17.94 6M18 18 6.06 6" />
              </svg>
            </button>
            <div className={styles.notificationProgressBar} />
          </li>
        ))}
      </ul>
    </div>
  );
}

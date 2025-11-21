import { formatDistanceToNow as formatDistanceToNowFns, format as formatFns } from 'date-fns';

/**
 * Convert UTC date to IST (Indian Standard Time - UTC+5:30)
 * Backend stores all timestamps in UTC, we convert to IST for display
 */
export function convertToIST(date: Date | string): Date {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  // IST is UTC + 5 hours 30 minutes = 330 minutes
  const istOffset = 330; // minutes
  const istDate = new Date(utcDate.getTime() + istOffset * 60 * 1000);
  return istDate;
}

/**
 * Format distance to now in IST
 * Example: "2 hours ago", "just now", "in 5 minutes"
 */
export function formatDistanceToNow(date: Date | string, options?: { addSuffix?: boolean }): string {
  const istDate = convertToIST(date);
  return formatDistanceToNowFns(istDate, { ...options, addSuffix: options?.addSuffix ?? true });
}

/**
 * Format date in IST
 * Example: "21 Nov 2025, 4:30 PM"
 */
export function formatDate(date: Date | string): string {
  const istDate = convertToIST(date);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(istDate);
}

/**
 * Format time only in IST
 * Example: "4:30 PM"
 */
export function formatTime(date: Date | string): string {
  const istDate = convertToIST(date);
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(istDate);
}

/**
 * Format date with custom format string in IST
 * Example: format(date, 'MMM d, yyyy') => "Nov 21, 2025"
 */
export function format(date: Date | string, formatStr: string): string {
  const istDate = convertToIST(date);
  return formatFns(istDate, formatStr);
}

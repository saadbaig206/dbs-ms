/**
 * Returns YYYY-MM-DD in local browser time zone (avoiding UTC offset bugs from toISOString).
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns hh:mm AM/PM in local browser time zone.
 */
export function getLocalTimeString(d: Date = new Date()): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\u202f/g, ' ');
}

/**
 * Formats YYYY-MM-DD string to a readable date (e.g. 16 Sep 2026).
 */
export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return 'N/A';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return dateStr || 'N/A';
  const [year, month, day] = parts;
  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Utility to escape HTML special characters in string variables
 * before rendering them into raw HTML print documents (XSS Protection).
 */

export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const stringified = String(str);
  return stringified
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

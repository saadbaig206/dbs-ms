/**
 * Utility functions to format and sanitize phone numbers for Pakistan (+92) and international formats.
 */

export function formatPhoneE164(phone: string, defaultCountryCode: string = '92'): string {
  if (!phone) return '';
  
  // Extract all digits
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 0 (e.g. 03001234567), replace leading 0 with country code
  if (digits.startsWith('0')) {
    return `+${defaultCountryCode}${digits.slice(1)}`;
  }
  
  // If already starts with country code (e.g. 923001234567)
  if (digits.startsWith(defaultCountryCode)) {
    return `+${digits}`;
  }
  
  // Return with leading + if already clean
  return `+${digits}`;
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return 'N/A';
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 11 && clean.startsWith('0')) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  
  if (clean.length === 12 && clean.startsWith('92')) {
    return `+92 ${clean.slice(2, 5)} ${clean.slice(5)}`;
  }
  
  return phone;
}

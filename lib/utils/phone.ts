/**
 * Utility functions to format and sanitize phone numbers for Pakistan (+92) and international formats.
 */

/**
 * Standardizes phone number inputs into a uniform format with space after country code (+92 3XXXXXXXXX).
 */
export function formatPhoneInput(value: string): string {
  if (!value) return '+92 ';

  let val = value.trim();

  // If user clears the input down to prefix or empty
  if (val === '' || val === '+' || val === '+9' || val === '+92' || val === '+92 ') {
    return '+92 ';
  }

  // Handle 0-prefix (e.g. 03001234567 -> +92 3001234567)
  if (val.startsWith('0')) {
    val = '+92 ' + val.substring(1);
  } else if (val.startsWith('92')) {
    val = '+92 ' + val.substring(2);
  } else if (!val.startsWith('+92 ')) {
    if (val.startsWith('+92')) {
      val = '+92 ' + val.substring(3);
    } else {
      val = '+92 ' + val.replace(/\D/g, '');
    }
  }

  const digits = val.substring(4).replace(/\D/g, '');
  return '+92 ' + digits.substring(0, 10);
}

export function formatPhoneE164(phone: string, defaultCountryCode: string = '92'): string {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('0')) {
    return `+${defaultCountryCode}${digits.slice(1)}`;
  }

  if (digits.startsWith(defaultCountryCode)) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function formatPhoneDisplay(phone: string | undefined | null): string {
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

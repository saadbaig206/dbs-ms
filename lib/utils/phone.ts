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

/**
 * Formats a phone number for display with clean spacing (+92 300 1234567).
 */
export function formatPhoneDisplay(value: string | undefined | null): string {
  if (!value) return 'N/A';
  let cleaned = value.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '92' + cleaned.substring(1);
  }
  if (cleaned.startsWith('92') && cleaned.length === 12) {
    return `+92 ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`;
  }
  return value;
}

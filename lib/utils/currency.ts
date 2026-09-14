/** Format amount in Pakistani Rupees */
export function formatPKR(amount: number, options?: { decimals?: boolean }): string {
  const showDecimals = options?.decimals ?? true;
  const formatted = amount.toLocaleString('en-PK', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  return `Rs ${formatted}`;
}

export function formatPKRCompact(amount: number): string {
  if (amount >= 1_000_000) return `Rs ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `Rs ${(amount / 1_000).toFixed(0)}k`;
  return formatPKR(amount, { decimals: false });
}

/** Format raw user identifiers / emails into clean display names */
export function formatUserName(input?: string, staffList?: any[]): string {
  if (!input) return 'Admin/Partner';
  const str = input.trim();
  if (!str) return 'Admin/Partner';

  if (staffList && staffList.length > 0) {
    const match = staffList.find(
      s => s.email && s.email.toLowerCase().trim() === str.toLowerCase()
    );
    if (match?.name) return match.name;
  }

  const lower = str.toLowerCase();
  if (lower === 'drzaini' || lower === 'drzaini@gmail.com' || lower === 'drzaini109' || lower === 'dr. zaini') {
    return 'Dr. Zaini';
  }
  if (lower === 'admin' || lower === 'admin@gmail.com') {
    return 'Admin User';
  }
  if (lower === 'staff' || lower === 'staff@gmail.com') {
    return 'Staff Member';
  }
  if (lower === 'dbsadmin') {
    return 'DBS Admin';
  }

  if (str.includes('@')) {
    const part = str.split('@')[0];
    return part
      .split(/[\._\-]/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  return str;
}

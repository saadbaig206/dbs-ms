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

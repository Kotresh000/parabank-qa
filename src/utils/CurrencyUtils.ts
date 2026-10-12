/**
 * All arithmetic is done in integer cents to avoid IEEE-754 floating-point
 * drift (e.g. 0.1 + 0.2 !== 0.3 in JS).  Numbers are only converted back
 * to decimals for display / assertion messages.
 */
export class CurrencyUtils {
  /** "$1,234.56" | "1234.56" | "-$50.00" → integer cents */
  static parseToCents(value: string): number {
    const cleaned = value.replace(/[$,\s]/g, '').replace(/[()]/g, '');
    const negative = cleaned.startsWith('-');
    const abs = cleaned.replace('-', '');
    const [intPart = '0', decPart = '00'] = abs.split('.');
    const cents =
      parseInt(intPart, 10) * 100 +
      parseInt(decPart.padEnd(2, '0').substring(0, 2), 10);
    return negative ? -cents : cents;
  }

  /** Sum an array of currency strings, returns total in cents */
  static sumToCents(values: string[]): number {
    return values.reduce((acc, v) => acc + this.parseToCents(v), 0);
  }

  /** Cents → "$X.XX" */
  static formatCents(cents: number): string {
    const sign = cents < 0 ? '-' : '';
    const abs = Math.abs(cents);
    return `${sign}$${(abs / 100).toFixed(2)}`;
  }

  /** Plain number (dollars) → cents, rounding to nearest cent */
  static dollarsToCents(amount: number): number {
    return Math.round(amount * 100);
  }
}

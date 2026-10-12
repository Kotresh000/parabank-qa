import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { TransferFundsPage } from '../src/pages/TransferFundsPage';
import { FindTransactionsPage } from '../src/pages/FindTransactionsPage';
import { StateManager } from '../src/utils/StateManager';
import { CurrencyUtils } from '../src/utils/CurrencyUtils';

/**
 * Scenario B — Transaction Aggregation & Currency Parsing
 *
 * Uses the user and accounts created in Scenario A (read from test-state.json).
 *
 * Flow:
 *  1. Login with Scenario A credentials
 *  2. Perform 3 fund transfers of distinct amounts from savings → checking
 *  3. Navigate to savings account activity page
 *  4. Extract debit rows from the HTML table
 *  5. Parse currency strings via integer-cent arithmetic (avoids float drift)
 *  6. Assert summed debits == expected total
 */
test.describe('Scenario B: Transaction Aggregation & Currency Parsing', () => {
  // Transfer amounts chosen to exercise decimal parsing edge-cases
  const TRANSFER_AMOUNTS = [150, 25.5, 8.99];

  test('3 fund transfers → parse table → assert debit total matches', async ({ page }) => {
    const state = StateManager.load();

    // ── 1. Login ──────────────────────────────────────────────────────────────
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(state.username, state.password);

    // ── 2. Perform three transfers (savings → checking) ───────────────────────
    const transferPage = new TransferFundsPage(page);

    for (const amount of TRANSFER_AMOUNTS) {
      await transferPage.goto();
      await transferPage.transfer(amount, state.savingsAccountId, state.checkingAccountId);
    }

    // ── 3. Navigate to savings account activity ───────────────────────────────
    const findPage = new FindTransactionsPage(page);
    const transactions = await findPage.getAllTransactions(state.savingsAccountId);

    expect(
      transactions.length,
      'Transaction table should have at least 3 rows'
    ).toBeGreaterThanOrEqual(3);

    // ── 4. Extract debit strings (money leaving the savings account) ──────────
    const debitStrings = transactions
      .map(t => t.debit)
      .filter(d => d !== '' && d !== '-');

    expect(
      debitStrings.length,
      'Should find at least 3 debit entries matching our transfers'
    ).toBeGreaterThanOrEqual(TRANSFER_AMOUNTS.length);

    // ── 5. Sum using integer cents — eliminates IEEE-754 float drift ──────────
    // Expected: 150.00 + 25.50 + 8.99 = 184.49
    const expectedCents = TRANSFER_AMOUNTS.reduce(
      (sum, amt) => sum + CurrencyUtils.dollarsToCents(amt),
      0
    );

    // Table is sorted oldest-first; our 3 transfers are the last N debit rows
    const recentDebits = debitStrings.slice(-TRANSFER_AMOUNTS.length);
    const actualCents  = CurrencyUtils.sumToCents(recentDebits);

    expect(
      actualCents,
      `Debit total should be ${CurrencyUtils.formatCents(expectedCents)} ` +
      `but got ${CurrencyUtils.formatCents(actualCents)}`
    ).toBe(expectedCents);
  });
});

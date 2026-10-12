import { test, expect } from '@playwright/test';
import { BankApi } from '../src/api/BankApi';
import { DataGenerator } from '../src/utils/DataGenerator';
import { isValidAccount, isValidTransaction } from '../src/api/types';

/**
 * Scenario C — API Parity Validation (fully headless, no browser)
 *
 * Flow:
 *  1. Register a brand-new user via REST/form API
 *  2. Retrieve the default account and deposit funds
 *  3. Perform a fund transfer to generate a transaction
 *  4. Query transaction history via REST endpoint
 *  5. Assert every field in every returned object exactly matches
 *     the predefined TypeScript Account / Transaction interfaces
 */
test.describe('Scenario C: API Parity Validation', () => {
  test('create user → deposit → transfer → assert API response schema', async ({ request }) => {
    const bankApi = new BankApi(request);
    const user    = DataGenerator.generateUser();

    // ── 1. Register new customer via API ─────────────────────────────────────
    const customerId = await bankApi.registerCustomer(user);
    expect(customerId, 'customerId must be a positive integer').toBeGreaterThan(0);

    // ── 2. Retrieve accounts and validate Account schema ─────────────────────
    const accounts = await bankApi.getAccounts(customerId);
    expect(accounts.length, 'New user should have at least one account').toBeGreaterThan(0);

    for (const account of accounts) {
      expect(
        isValidAccount(account),
        `Account object failed schema check:\n${JSON.stringify(account, null, 2)}`
      ).toBe(true);
    }

    const primaryAccount = accounts[0];

    // ── 3. Deposit funds ──────────────────────────────────────────────────────
    // deposit() returns plain text, so we re-fetch via getAccounts to validate schema
    await bankApi.deposit(primaryAccount.id, 1000);
    const accountsAfterDeposit = await bankApi.getAccounts(customerId);
    const depositedAccount = accountsAfterDeposit.find(a => a.id === primaryAccount.id);
    expect(depositedAccount).toBeDefined();
    expect(isValidAccount(depositedAccount!), 'Account must match Account schema after deposit').toBe(true);
    expect(depositedAccount!.balance, 'Balance must reflect the deposit').toBeGreaterThanOrEqual(1000);

    // ── 4. Open a second account to transfer into ─────────────────────────────
    const secondAccount = await bankApi.createAccount(customerId, 0, primaryAccount.id);
    expect(isValidAccount(secondAccount), 'createAccount response must match Account schema').toBe(true);

    // ── 5. Transfer to generate a debit transaction ───────────────────────────
    const TRANSFER_AMOUNT = 250;
    await bankApi.transfer(primaryAccount.id, secondAccount.id, TRANSFER_AMOUNT);

    // ── 6. Query transaction history ──────────────────────────────────────────
    const transactions = await bankApi.getTransactions(primaryAccount.id);
    expect(
      transactions.length,
      'Transaction list must not be empty after a transfer'
    ).toBeGreaterThan(0);

    // ── 7. Assert every transaction object matches the Transaction interface ───
    for (const tx of transactions) {
      expect(
        isValidTransaction(tx),
        `Transaction object failed schema check:\n${JSON.stringify(tx, null, 2)}`
      ).toBe(true);

      // Additional field-level assertions beyond the type shape
      expect(tx.accountId).toBe(primaryAccount.id);
      expect(tx.amount).toBeGreaterThan(0);
      // date is a Unix ms timestamp — must be a positive integer > 0
      expect(tx.date).toBeGreaterThan(0);
    }

    // ── 8. Verify the debit transaction amount matches what we transferred ─────
    const debitTx = transactions.find(
      t => t.type === 'Debit' && t.amount === TRANSFER_AMOUNT
    );
    expect(
      debitTx,
      `Expected a Debit transaction of $${TRANSFER_AMOUNT} in the history`
    ).toBeDefined();
  });
});

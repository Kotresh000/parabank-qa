import { test, expect } from '@playwright/test';
import { AdminApi } from '../src/api/AdminApi';
import { BankApi } from '../src/api/BankApi';
import { RegisterPage } from '../src/pages/RegisterPage';
import { OpenAccountPage } from '../src/pages/OpenAccountPage';
import { LoanPage } from '../src/pages/LoanPage';
import { DataGenerator } from '../src/utils/DataGenerator';
import { StateManager } from '../src/utils/StateManager';

/**
 * Scenario A — Global State & Loan Orchestration
 *
 * Flow:
 *  1. API: cleanDB + set Loan Provider → "Web Service"
 *  2. UI:  register a dynamically generated user
 *          (ParaBank auto-creates a CHECKING account with $515.50)
 *  3. API: resolve customerId + default account ID
 *  4. UI:  open a second Checking account
 *  5. UI:  apply for a $1000 loan (down payment $100 from checking)
 *  6. API: assert loan account balance == $1000
 *  7.      persist state to test-state.json for Scenario B
 */
test.describe('Scenario A: Global State & Loan Orchestration', () => {
  test('reset DB → register → open account → apply loan → verify balance', async ({
    page,
    request,
  }) => {
    // ── 1. API Pre-condition: clean shared database ──────────────────────────
    const adminApi = new AdminApi(request);
    await adminApi.cleanDatabase();
    await adminApi.setLoanProviderWebService(page);

    // ── 2. Generate unique user credentials ───────────────────────────────────
    const user = DataGenerator.generateUser();
    const bankApi = new BankApi(request);

    // ── 3. UI: Register new user ──────────────────────────────────────────────
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register(user);

    const welcome = await registerPage.getWelcomeMessage();
    expect(welcome, 'Registration should show a welcome message').toContain('Welcome');

    // ── 4. API: resolve customerId and default CHECKING account ───────────────
    // ParaBank auto-creates a CHECKING account with $515.50 on registration —
    // no seed deposit required.
    const customer = await bankApi.login(user.username, user.password);
    expect(customer.id, 'customerId must be a positive integer').toBeGreaterThan(0);

    const accounts = await bankApi.getAccounts(customer.id);
    expect(accounts.length, 'Registered user must have at least one account').toBeGreaterThan(0);

    const defaultAccount = accounts[0];
    expect(defaultAccount.balance, 'Default account must have funds').toBeGreaterThan(0);

    // ── 5. UI: Open a new Checking account ───────────────────────────────────
    const openPage = new OpenAccountPage(page);
    await openPage.goto();
    const checkingAccountId = await openPage.openCheckingAccount(defaultAccount.id);
    expect(checkingAccountId, 'New checking account ID must be positive').toBeGreaterThan(0);

    // ── 6. UI: Apply for a loan ───────────────────────────────────────────────
    const loanPage = new LoanPage(page);
    await loanPage.goto();

    const LOAN_AMOUNT  = 1000;
    const DOWN_PAYMENT = 100;

    // Down payment comes from the default account (has $515.50 after account open fee)
    const { approved, loanAccountId, message } = await loanPage.applyForLoan(
      LOAN_AMOUNT,
      DOWN_PAYMENT,
      defaultAccount.id
    );

    expect(approved, `Loan should be approved. Response: "${message}"`).toBe(true);
    expect(loanAccountId, 'Loan account ID must be positive').toBeGreaterThan(0);

    // ── 7. API: Verify loan account balance equals the requested loan amount ───
    const allAccounts = await bankApi.getAccounts(customer.id);
    const loanAccount = allAccounts.find(a => a.id === loanAccountId);

    expect(loanAccount, `Loan account ${loanAccountId} must appear in customer accounts`).toBeDefined();
    expect(loanAccount!.balance, 'Loan account balance should equal requested loan amount').toBe(LOAN_AMOUNT);

    // ── 8. Persist state for Scenario B ──────────────────────────────────────
    StateManager.save({
      username:         user.username,
      password:         user.password,
      customerId:       customer.id,
      savingsAccountId: defaultAccount.id,   // named "savings" for semantic clarity
      checkingAccountId,
      loanAccountId,
    });
  });
});

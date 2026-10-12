import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface TransactionRow {
  date: string;
  description: string;
  debit: string;   // empty string when not a debit
  credit: string;  // empty string when not a credit
}

export class FindTransactionsPage extends BasePage {
  constructor(page: Page) { super(page); }

  /**
   * Navigate to the "Find Transactions" page (/parabank/findtrans.htm),
   * select the account, search by today's date range, and return all rows.
   *
   * The results container is AJAX-driven (display:none by default) —
   * we wait for it to become visible without any static sleep.
   */
  async getAllTransactions(accountId: number): Promise<TransactionRow[]> {
    await this.navigate('/parabank/findtrans.htm');

    // Wait for account dropdown to be populated — no static sleep
    await this.waitForSelectOptions('#accountId');
    await this.page.selectOption('#accountId', String(accountId));

    // Build today's date in MM-DD-YYYY format (ParaBank's expected input format)
    const today = new Date();
    const pad   = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${pad(today.getMonth() + 1)}-${pad(today.getDate())}-${today.getFullYear()}`;

    // Use "Find by Date Range" — covers all transactions from today
    await this.page.fill('#fromDate', dateStr);
    await this.page.fill('#toDate', dateStr);
    await this.page.click('#findByDateRange');

    // Wait for the AJAX result container to become visible — no static sleep
    await this.page.waitForFunction(() => {
      const el = document.querySelector('#resultContainer') as HTMLElement | null;
      return el !== null && el.style.display !== 'none';
    }, { timeout: 30_000 });

    await this.page.waitForSelector('#transactionBody tr', { timeout: 15_000 });

    const rows = await this.page.locator('#transactionBody tr').all();
    const results: TransactionRow[] = [];

    for (const row of rows) {
      const cells = await row.locator('td').all();
      if (cells.length < 3) continue;

      const date        = (await cells[0].innerText()).trim();
      const description = (await cells[1].innerText()).trim();
      const debit       = cells.length >= 4 ? (await cells[2].innerText()).trim() : '';
      const credit      = cells.length >= 4 ? (await cells[3].innerText()).trim() : '';

      results.push({ date, description, debit, credit });
    }

    return results;
  }
}

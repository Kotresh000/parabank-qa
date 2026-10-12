import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AccountOverviewPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.navigate('/parabank/overview.htm');
    // Wait until at least one account row has loaded (no static sleep)
    await this.page.waitForFunction(() => {
      const rows = document.querySelectorAll('#accountTable tbody tr td:first-child a');
      return rows.length > 0;
    }, { timeout: 30_000 });
  }

  async getAllAccountIds(): Promise<number[]> {
    const links = this.page.locator('#accountTable tbody tr td:first-child a');
    const count = await links.count();
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      const text = await links.nth(i).innerText();
      ids.push(parseInt(text.trim(), 10));
    }
    return ids;
  }

  async getFirstAccountId(): Promise<number> {
    const ids = await this.getAllAccountIds();
    if (ids.length === 0) throw new Error('No accounts found on overview page');
    return ids[0];
  }

  async getAccountBalance(accountId: number): Promise<number> {
    const row = this.page
      .locator('#accountTable tbody tr')
      .filter({ has: this.page.locator(`a:text("${accountId}")`) });
    const raw = await row.locator('td').nth(1).innerText();
    return parseFloat(raw.replace(/[$,]/g, ''));
  }
}

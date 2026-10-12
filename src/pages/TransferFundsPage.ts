import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class TransferFundsPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.navigate('/parabank/transfer.htm');
    // Both dropdowns must be populated before we can interact — no static sleep
    await this.waitForSelectOptions('#fromAccountId');
    await this.waitForSelectOptions('#toAccountId');
  }

  async transfer(
    amount: number,
    fromAccountId: number,
    toAccountId: number
  ): Promise<void> {
    await this.page.fill('#amount', String(amount));
    await this.page.selectOption('#fromAccountId', String(fromAccountId));
    await this.page.selectOption('#toAccountId', String(toAccountId));
    await this.page.click('input[value="Transfer"]');
    // Wait for success header — no static sleep
    await this.page.waitForSelector('#showResult h1', { timeout: 30_000 });
  }
}

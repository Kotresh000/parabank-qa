import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class OpenAccountPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.navigate('/parabank/openaccount.htm');
    // Wait for the source-account dropdown to populate — no static sleep
    await this.waitForSelectOptions('#fromAccountId');
  }

  /**
   * Opens a new Checking account (type=0) funded from `fromAccountId`.
   * Returns the newly created account ID extracted from the UI.
   */
  async openCheckingAccount(fromAccountId: number): Promise<number> {
    await this.page.selectOption('#type', '0'); // 0 = CHECKING
    await this.page.selectOption('#fromAccountId', String(fromAccountId));
    await this.page.click('input[value="Open New Account"]');

    // #newAccountId IS the <a> element itself (ParaBank renders it as a direct link)
    await this.page.waitForSelector('#newAccountId', { timeout: 30_000 });
    const text = await this.page.locator('#newAccountId').innerText();
    return parseInt(text.trim(), 10);
  }
}

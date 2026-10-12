import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface LoanResult {
  approved: boolean;
  loanAccountId: number;
  message: string;
}

export class LoanPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.navigate('/parabank/requestloan.htm');
    // Wait for the from-account dropdown to populate — no static sleep
    await this.waitForSelectOptions('#fromAccountId');
  }

  async applyForLoan(
    amount: number,
    downPayment: number,
    fromAccountId: number
  ): Promise<LoanResult> {
    await this.page.fill('#amount', String(amount));
    await this.page.fill('#downPayment', String(downPayment));
    await this.page.selectOption('#fromAccountId', String(fromAccountId));
    await this.page.click('input[value="Apply Now"]');

    // Wait for the result section — no static sleep
    await this.page.waitForSelector('#requestLoanResult', { timeout: 30_000 });
    await this.page.waitForSelector('#loanStatus', { timeout: 30_000 });

    const statusText = (await this.page.locator('#loanStatus').innerText()).trim();
    const approved = statusText.toLowerCase() === 'approved';

    let loanAccountId = 0;
    if (approved) {
      // Wait for the new loan account ID element — no static sleep
      await this.page.waitForSelector('#newAccountId', { timeout: 30_000 });
      const idText = await this.page.locator('#newAccountId').innerText();
      loanAccountId = parseInt(idText.trim(), 10);
    }

    const message = await this.page
      .locator('#requestLoanResult p')
      .first()
      .innerText()
      .catch(() => statusText);

    return { approved, loanAccountId, message };
  }
}

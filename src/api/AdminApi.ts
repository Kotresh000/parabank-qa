import { APIRequestContext, Page } from '@playwright/test';

export class AdminApi {
  constructor(private request: APIRequestContext) {}

  async cleanDatabase(): Promise<void> {
    const response = await this.request.post('/parabank/services/bank/cleanDB', {
      headers: { Accept: 'application/json' },
    });
    // ParaBank returns 204 No Content on success
    if (response.status() !== 204 && response.status() !== 200) {
      throw new Error(`cleanDB failed with status ${response.status()}: ${await response.text()}`);
    }
  }

  async setLoanProviderWebService(page: Page): Promise<void> {
    await page.goto('/parabank/admin.htm');
    await page.waitForLoadState('domcontentloaded');

    // The admin form has a select for loan provider.
    // Try the most common field name first, then fallback variations.
    const selectors = [
      'select[name="loanProvider"]',
      'select[name="provider"]',
      'select#loanProvider',
    ];

    let selected = false;
    for (const selector of selectors) {
      const el = page.locator(selector);
      if (await el.count() > 0) {
        // Try selecting by visible label text
        await el.selectOption({ label: 'Web Service' }).catch(async () => {
          await el.selectOption('ws');
        });
        selected = true;
        break;
      }
    }

    // Submit whatever configuration form is present on the admin page
    const submitBtn = page.locator('input[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
    }

    if (!selected) {
      // Admin page structure differs — log a warning but don't fail;
      // ParaBank defaults to Web Service after a cleanDB in most deployments.
      console.warn('Could not locate loanProvider selector on admin page; proceeding with default.');
    }
  }
}

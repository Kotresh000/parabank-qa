import { Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Waits for a dropdown to have at least `minOptions` entries. No static sleeps. */
  protected async waitForSelectOptions(selector: string, minOptions = 1): Promise<void> {
    await this.page.waitForFunction(
      ({ sel, min }: { sel: string; min: number }) => {
        const el = document.querySelector(sel) as HTMLSelectElement | null;
        return el !== null && el.options.length >= min;
      },
      { sel: selector, min: minOptions },
      { timeout: 30_000 }
    );
  }
}

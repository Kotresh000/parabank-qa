import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { UserCredentials } from '../api/types';

export class RegisterPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.navigate('/parabank/register.htm');
  }

  async register(user: UserCredentials): Promise<void> {
    await this.page.fill('#customer\\.firstName',             user.firstName);
    await this.page.fill('#customer\\.lastName',              user.lastName);
    await this.page.fill('#customer\\.address\\.street',      user.address.street);
    await this.page.fill('#customer\\.address\\.city',        user.address.city);
    await this.page.fill('#customer\\.address\\.state',       user.address.state);
    await this.page.fill('#customer\\.address\\.zipCode',     user.address.zipCode);
    await this.page.fill('#customer\\.phoneNumber',           user.phoneNumber);
    await this.page.fill('#customer\\.ssn',                   user.ssn);
    await this.page.fill('#customer\\.username',              user.username);
    await this.page.fill('#customer\\.password',              user.password);
    await this.page.fill('#repeatedPassword',                 user.password);
    await this.page.click('input[value="Register"]');
    await this.page.waitForSelector('#rightPanel h1', { timeout: 30_000 });
  }

  async getWelcomeMessage(): Promise<string> {
    return this.page.locator('#rightPanel h1').innerText();
  }
}

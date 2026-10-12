import { APIRequestContext } from '@playwright/test';
import { Account, Transaction, LoanResponse, UserCredentials } from './types';

export class BankApi {
  private readonly base = '/parabank/services/bank';
  private readonly jsonHeaders = { Accept: 'application/json' };

  constructor(private request: APIRequestContext) {}

  async login(username: string, password: string): Promise<{ id: number }> {
    const res = await this.request.get(
      `${this.base}/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`,
      { headers: this.jsonHeaders }
    );
    if (!res.ok()) throw new Error(`Login failed (${res.status()}): ${await res.text()}`);
    return res.json();
  }

  async getAccounts(customerId: number): Promise<Account[]> {
    const res = await this.request.get(
      `${this.base}/customers/${customerId}/accounts`,
      { headers: this.jsonHeaders }
    );
    if (!res.ok()) throw new Error(`getAccounts failed (${res.status()})`);
    const data = await res.json();
    // REST endpoint returns a plain JSON array — handle that and the
    // XML-derived {"account":[...]} shape for robustness.
    if (Array.isArray(data)) return data;
    if (!data.account) return [];
    return Array.isArray(data.account) ? data.account : [data.account];
  }

  // Deposit returns plain text "Successfully deposited $X to account #Y" — not JSON
  async deposit(accountId: number, amount: number): Promise<void> {
    const res = await this.request.post(
      `${this.base}/deposit?accountId=${accountId}&amount=${amount}`,
      { headers: this.jsonHeaders }
    );
    if (!res.ok()) throw new Error(`deposit failed (${res.status()}): ${await res.text()}`);
  }

  async createAccount(
    customerId: number,
    accountType: 0 | 1, // 0 = CHECKING, 1 = SAVINGS
    fromAccountId: number
  ): Promise<Account> {
    const res = await this.request.post(
      `${this.base}/createAccount?customerId=${customerId}&newAccountType=${accountType}&fromAccountId=${fromAccountId}`,
      { headers: this.jsonHeaders }
    );
    if (!res.ok()) throw new Error(`createAccount failed (${res.status()}): ${await res.text()}`);
    return res.json();
  }

  async transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<void> {
    const res = await this.request.post(
      `${this.base}/transfer?fromAccountId=${fromAccountId}&toAccountId=${toAccountId}&amount=${amount}`,
      { headers: this.jsonHeaders }
    );
    if (!res.ok()) throw new Error(`transfer failed (${res.status()}): ${await res.text()}`);
  }

  async requestLoan(
    customerId: number,
    amount: number,
    downPayment: number,
    fromAccountId: number
  ): Promise<LoanResponse> {
    const res = await this.request.post(
      `${this.base}/requestLoan?customerId=${customerId}&amount=${amount}&downPayment=${downPayment}&fromAccountId=${fromAccountId}`,
      { headers: this.jsonHeaders }
    );
    if (!res.ok()) throw new Error(`requestLoan failed (${res.status()}): ${await res.text()}`);
    return res.json();
  }

  async getTransactions(accountId: number): Promise<Transaction[]> {
    const res = await this.request.get(
      `${this.base}/accounts/${accountId}/transactions`,
      { headers: this.jsonHeaders }
    );
    if (!res.ok()) throw new Error(`getTransactions failed (${res.status()})`);
    const data = await res.json();
    // REST endpoint returns a plain JSON array
    if (Array.isArray(data)) return data;
    if (!data.transaction) return [];
    return Array.isArray(data.transaction) ? data.transaction : [data.transaction];
  }

  async findTransactionsByAmount(accountId: number, amount: number): Promise<Transaction[]> {
    const res = await this.request.get(
      `${this.base}/accounts/${accountId}/transactions/amount/${amount}`,
      { headers: this.jsonHeaders }
    );
    if (!res.ok()) throw new Error(`findTransactions failed (${res.status()})`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (!data.transaction) return [];
    return Array.isArray(data.transaction) ? data.transaction : [data.transaction];
  }

  // Used in Scenario C: create customer via form POST then return customer ID via login.
  // A GET is required first to establish a server session before the POST is accepted.
  async registerCustomer(user: UserCredentials): Promise<number> {
    await this.request.get('/parabank/register.htm');

    const params = new URLSearchParams({
      'customer.firstName': user.firstName,
      'customer.lastName': user.lastName,
      'customer.address.street': user.address.street,
      'customer.address.city': user.address.city,
      'customer.address.state': user.address.state,
      'customer.address.zipCode': user.address.zipCode,
      'customer.phoneNumber': user.phoneNumber,
      'customer.ssn': user.ssn,
      'customer.username': user.username,
      'customer.password': user.password,
      repeatedPassword: user.password,
    });

    const res = await this.request.post('/parabank/register.htm', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: params.toString(),
    });
    if (res.status() !== 200 && res.status() !== 302) {
      throw new Error(`registerCustomer failed (${res.status()}): ${await res.text()}`);
    }

    const customer = await this.login(user.username, user.password);
    return customer.id;
  }
}

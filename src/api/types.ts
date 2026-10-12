export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  address: Address;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}

// Strict interface used for API parity validation in Scenario C
export interface Account {
  id: number;
  customerId: number;
  type: 'CHECKING' | 'SAVINGS' | 'LOAN';
  balance: number;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: 'Debit' | 'Credit';
  date: number; // Unix timestamp in milliseconds
  amount: number;
  description: string;
}

export interface LoanResponse {
  responseDate: number; // Unix timestamp in milliseconds
  loanProviderName: string;
  approved: boolean;
  accountId?: number;
}

export interface UserCredentials {
  firstName: string;
  lastName: string;
  address: Address;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}

// Runtime schema validator — TypeScript interfaces are erased at runtime,
// so we validate shape manually to satisfy the API parity requirement.
export function isValidTransaction(data: unknown): data is Transaction {
  if (typeof data !== 'object' || data === null) return false;
  const t = data as Record<string, unknown>;
  return (
    typeof t['id'] === 'number' &&
    typeof t['accountId'] === 'number' &&
    (t['type'] === 'Debit' || t['type'] === 'Credit') &&
    typeof t['date'] === 'number' &&   // API returns Unix ms timestamp
    typeof t['amount'] === 'number' &&
    typeof t['description'] === 'string'
  );
}

export function isValidAccount(data: unknown): data is Account {
  if (typeof data !== 'object' || data === null) return false;
  const a = data as Record<string, unknown>;
  return (
    typeof a['id'] === 'number' &&
    typeof a['customerId'] === 'number' &&
    (a['type'] === 'CHECKING' || a['type'] === 'SAVINGS' || a['type'] === 'LOAN') &&
    typeof a['balance'] === 'number'
  );
}

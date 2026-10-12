import * as fs from 'fs';
import * as path from 'path';

export interface TestState {
  username: string;
  password: string;
  customerId: number;
  savingsAccountId: number;   // default account created at registration
  checkingAccountId: number;  // opened in Scenario A
  loanAccountId: number;      // approved in Scenario A
}

const STATE_FILE = path.join(process.cwd(), 'test-results', 'test-state.json');

export class StateManager {
  static save(state: TestState): void {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  }

  static load(): TestState {
    if (!fs.existsSync(STATE_FILE)) {
      throw new Error(
        'test-state.json not found — run Scenario A before Scenario B.'
      );
    }
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as TestState;
  }

  static clear(): void {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  }
}

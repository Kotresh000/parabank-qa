# ParaBank QA Automation Framework

**Role:** Senior QA Automation Engineer Assignment — ImmverseAI  
**Stack:** Playwright · TypeScript  
**Target:** [ParaBank](https://parabank.parasoft.com)

---

## Project Structure

```
parabank-qa/
├── reporters/
│   └── glassmorphism-reporter.ts   # Custom HTML reporter (glassmorphism, #F48031)
├── src/
│   ├── api/
│   │   ├── AdminApi.ts             # DB reset + loan provider config
│   │   ├── BankApi.ts              # ParaBank REST API wrapper
│   │   └── types.ts                # TypeScript interfaces + runtime validators
│   ├── pages/                      # Page Object Model
│   │   ├── BasePage.ts
│   │   ├── RegisterPage.ts
│   │   ├── LoginPage.ts
│   │   ├── AccountOverviewPage.ts
│   │   ├── OpenAccountPage.ts
│   │   ├── LoanPage.ts
│   │   ├── TransferFundsPage.ts
│   │   └── FindTransactionsPage.ts
│   └── utils/
│       ├── DataGenerator.ts        # Unique user/credentials per run
│       ├── CurrencyUtils.ts        # Integer-cent arithmetic (no float drift)
│       └── StateManager.ts         # Cross-spec state file (test-state.json)
├── tests/
│   ├── scenario-a.spec.ts          # API+UI: DB reset → register → loan
│   ├── scenario-b.spec.ts          # UI: transfers → table parse → sum assert
│   └── scenario-c.spec.ts          # Headless API: schema parity validation
├── test-results/
│   └── report.html                 # Generated after each run
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── DECISIONS.md
```

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9

---

## Install Dependencies

```bash
cd parabank-qa
npm install
npx playwright install chromium
```

---

## Run Tests

### Full suite (headless)

```bash
npm test
```

### Full suite (headed — watch the browser)

```bash
npx playwright test --headed
```

### Individual scenarios

```bash
npm run test:scenario-a   # Scenario A: Loan orchestration
npm run test:scenario-b   # Scenario B: Transaction parsing
npm run test:scenario-c   # Scenario C: API parity
```

> **Note:** Run order matters. Scenario B reads state written by Scenario A (`test-results/test-state.json`). The default `npm test` command runs them in alphabetical order (A → B → C), which is correct.

---

## View the Custom HTML Report

After any test run, open the report:

```bash
# macOS
open test-results/report.html

# Linux
xdg-open test-results/report.html

# Or via npm script
npm run report
```

The report features a **glassmorphism UI** (translucent cards, backdrop-blur, layered elements) with **#F48031** as the primary accent colour for headers, pass indicators, and the progress bar.

---

## CI (GitHub Actions example)

```yaml
- name: Install deps
  run: npm ci && npx playwright install --with-deps chromium

- name: Run tests
  run: npm test

- name: Upload report
  uses: actions/upload-artifact@v4
  with:
    name: qa-report
    path: test-results/report.html
```

---

## Design Decisions

See [DECISIONS.md](./DECISIONS.md) for the full Architectural Decision Record covering state contention, floating-point handling, and the API-vs-UI boundary.

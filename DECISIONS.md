# Architectural Decision Record

**Project:** ParaBank QA Automation Framework  
**Author:** Senior QA Automation Engineer  
**Date:** October 2026

---

## 1. State Contention

> *ParaBank is a shared public sandbox. If two automation engineers run your test suite simultaneously from different CI workers, how does your framework prevent data collisions?*

### Problem

ParaBank's `cleanDB` endpoint wipes the **entire shared database**. If engineer A's CI worker calls `cleanDB` while engineer B's suite is mid-flight, B's registered users and accounts are deleted, causing unpredictable failures.

Username conflicts are a secondary risk: if both workers register `user_abc123` at the same moment, one registration will fail or corrupt the other.

### Solution Applied

**Username uniqueness via cryptographic entropy**  
`DataGenerator.generateUsername()` uses `crypto.randomBytes(4)` to produce an 8-character hex suffix (e.g. `qa_3f9ab21c`). With 2³² possible suffixes, the probability of a collision between two concurrent workers is negligible (~1 in 4 billion per run).

**`cleanDB` is intentionally scoped to Scenario A only**  
The database reset is the first action in Scenario A and is documented as a known shared-resource risk. In a real team environment this would be governed by one of:

- **Isolated instances per CI job** — each worker points to its own ParaBank Docker container (the definitive fix). Environment variable `BASE_URL` makes this a one-line change in `playwright.config.ts`.
- **Test-run locking** — a distributed mutex (e.g. Redis `SET NX EX`) that a worker acquires before calling `cleanDB` and releases after Scenario A completes, preventing concurrent resets.
- **Dedicated test data seeding** — skip `cleanDB` entirely; instead create users with unique credentials and never rely on global state. Each worker is fully self-contained.

**Cross-spec state is isolated to a file on the local worker**  
`StateManager` writes `test-results/test-state.json` locally. Two CI workers each write their own copy in their own workspace — there is no shared file system coupling between workers.

---

## 2. Currency Handling

> *How did you handle floating-point precision issues in JavaScript/TypeScript when summing up the parsed transaction amounts in Scenario B?*

### Problem

IEEE-754 double-precision arithmetic produces errors for decimal currency values:

```ts
0.1 + 0.2            // 0.30000000000000004
150 + 25.5 + 8.99    // 184.49 ✓ (coincidentally exact)
// but:
0.1 + 0.2 + 0.3      // 0.6000000000000001
```

A test that sums 10–20 transaction rows and compares with `toBe()` will fail intermittently when small errors accumulate.

### Solution Applied — Integer Cent Arithmetic

All monetary values are converted to **integer cents** before any arithmetic is performed. Integers in JavaScript are exact up to `Number.MAX_SAFE_INTEGER` (≈ 9 quadrillion cents = $90 trillion), well beyond any realistic transaction total.

```ts
// CurrencyUtils.parseToCents("$25.50") → 2550  (integer, exact)
// CurrencyUtils.parseToCents("$8.99")  →  899  (integer, exact)
// 15000 + 2550 + 899                   → 18449  (integer, exact)
```

The parser removes `$`, `,`, and whitespace, then splits on `.` and reconstructs cents as:

```
cents = parseInt(intPart) * 100 + parseInt(decPart.padEnd(2,'0').slice(0,2))
```

No floating-point arithmetic is used until the final `formatCents()` display call, which only needs to be presentationally correct (not used in assertions).

`dollarsToCents()` uses `Math.round(amount * 100)` for converting the hardcoded transfer amounts (`150`, `25.5`, `8.99`) to cents before building the expected total — `Math.round` absorbs the single-multiplication float error before it can affect the comparison.

---

## 3. Design Pattern — API vs UI Boundary

> *Where did you draw the line between API actions (setup/teardown) and UI actions (user simulation) in your test strategy?*

### Principle

**Use the API for anything the user would never notice; use the UI for anything the user actually does.**

The goal of UI automation is to simulate real user journeys and catch regressions in user-facing flows. Forcing every setup step through the browser adds noise, slows execution, and couples tests to UI elements that may change independently of the business logic being verified.

### Where the Line Falls in This Framework

| Action | Layer | Reason |
|---|---|---|
| Reset database (`cleanDB`) | API | Pure infrastructure; no UX value in navigating admin UI |
| Set Loan Provider | UI (admin page) | No REST endpoint exposed; admin page is the only interface |
| Register new user | UI | Registration flow itself is a user-facing feature worth testing |
| Get customer ID after registration | API | Internal plumbing; avoids parsing DOM just to extract an ID |
| Seed account balance (deposit) | API | Pre-condition, not a user story; faster and deterministic via API |
| Open Checking account | UI | User-facing flow — exercises the account-open form and dropdown |
| Apply for loan | UI | Core business flow — loan approval UI is an explicit requirement |
| Verify loan account balance | API | Verification of a backend state; reading the overview DOM is brittle |
| Fund transfers (Scenario B) | UI | Transfer flow is explicitly what the scenario tests |
| Parse transaction history | UI | Explicitly required: validate table parsing and currency math |
| Register user (Scenario C) | API | Scenario C is defined as "purely headless" — no browser allowed |
| Deposit / transfer / query (Scenario C) | API | Same: all assertions are on API response schema, not rendered HTML |

### Summary

- **API layer** (`BankApi`, `AdminApi`): setup, teardown, state verification, and headless tests.
- **UI layer** (Page Objects): scenarios where the rendered user experience is the product under test.

This boundary keeps test suites fast, deterministic, and focused — UI tests break for UI reasons; API tests break for API reasons.

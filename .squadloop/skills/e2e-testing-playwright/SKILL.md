---
name: e2e-testing-playwright
description: Best practices for writing robust Playwright E2E UI tests, page object models, locator strategies, and UI verification.
---

# === [SKILL: PLAYWRIGHT E2E UI TESTING] ===

Guidelines for writing, running, and maintaining Playwright end-to-end UI tests for web applications.

## 1. Directory & File Structure
- Place all Playwright UI specs under `frontend/e2e/` or `e2e/`.
- Name test files with `.spec.ts` suffix (e.g. `frontend/e2e/campaigns/create-campaign.spec.ts`).
- Store Page Object Models in `e2e/pages/` when applicable.

## 2. Locator Best Practices
- Prefer semantic, user-facing locators:
  - `page.getByRole('button', { name: 'Create Campaign' })`
  - `page.getByLabel('Campaign Name')`
  - `page.getByPlaceholder('Enter campaign name')`
- Use `data-testid` when semantic role/label locators are ambiguous: `page.getByTestId('submit-btn')`.
- Avoid brittle CSS or XPath selectors (e.g. `div > div > button.btn-primary`).

## 3. Web Assertion Standards
- Always use auto-retrying web assertions from `@playwright/test`:
  - `await expect(page.getByText('Campaign Created Successfully')).toBeVisible();`
  - `await expect(page).toHaveURL(/\/campaigns\/[0-9]+/);`
- Never use fixed sleep delays (`page.waitForTimeout` is prohibited).

## 4. UI Acceptance Criteria Verification
- For every UI Gherkin AC scenario:
  - Write a dedicated `test('Scenario: ...', async ({ page }) => { ... })`.
  - Verify form inputs, validation error messages, loading spinners, network responses, and page transitions.

import { test, expect, type Page, type Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Barion Sandbox test card details — same constant as e2e/checkout.spec.ts (duplicated
// rather than shared, matching this project's current "no test-utils file yet" reality).
// See: https://docs.barion.com/Sandbox#Test_cards
const BARION_TEST_CARD = {
  // Successful payment card
  number: '4444 8888 8888 5559',
  // Any future date works
  expiry: '12/30',
  // Any 3-digit number works
  cvc: '123',
  // Cardholder name
  name: 'Test User',
  // Email address
  emailAddress: 'test@example.com',
};

// The documented default from .env.example, used only as a last-resort fallback so this
// file never hardcodes the real password as its primary source of truth.
const ENV_EXAMPLE_DEFAULT_PASSWORD = 'babuci';

/**
 * Resolves the real workshop-gate password the same way the app does: from the local
 * `.env` (`WORKSHOP_GATE_PASSWORD`), falling back to `process.env` (in case it's been
 * exported into the shell), and finally to the documented `.env.example` value. Playwright's
 * test runner does not go through Astro/Vite's env loading, so `.env` has to be read
 * directly here rather than assumed to already be on `process.env`.
 */
function resolveWorkshopGatePassword(): string {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    const contents = fs.readFileSync(envPath, 'utf-8');
    const match = contents.match(/^WORKSHOP_GATE_PASSWORD=(.*)$/m);
    if (match) {
      const value = match[1].trim();
      if (value) return value;
    }
  } catch {
    // .env not present locally (e.g. CI) — fall through to other sources.
  }
  return process.env.WORKSHOP_GATE_PASSWORD ?? ENV_EXAMPLE_DEFAULT_PASSWORD;
}

const WORKSHOP_GATE_PASSWORD = resolveWorkshopGatePassword();
// Guaranteed different from the real password, whatever it is, for the "wrong password"
// case below. All-distinct characters (no repeats) deliberately avoided the risk of any
// repeated-character coalescing in fast synthetic keystrokes; verified live either way.
const DEFAULT_WRONG_GATE_PASSWORD = '360517';
const WRONG_GATE_PASSWORD =
  WORKSHOP_GATE_PASSWORD === DEFAULT_WRONG_GATE_PASSWORD ? '715260' : DEFAULT_WRONG_GATE_PASSWORD;

const WORKSHOP_GATE_PATH = '/workshop-gate';

/** The real, rendered 6-box PIN input's underlying `<input>` (bits-ui PinInput). */
function gateOtpInput(page: Page): Locator {
  return page.locator('input[data-pin-input-input]');
}

/**
 * Drives the real gate UI (not a raw API call) to unlock `/workshops` for the current
 * browser context: navigates to `/workshops`, and if redirected to the password gate,
 * types the real password through the rendered Input OTP form and waits for the
 * resulting redirect back to `/workshops`. No-ops if already unlocked.
 */
async function unlockWorkshopGate(page: Page): Promise<void> {
  await page.goto('/workshops');
  if (!page.url().includes(WORKSHOP_GATE_PATH)) {
    return;
  }

  const otpInput = gateOtpInput(page);
  await otpInput.click();
  // See the note in the gate test above: a short pause avoids the first keystroke being
  // dropped by the OTP input's focus-triggered re-render.
  await page.waitForTimeout(150);
  await otpInput.pressSequentially(WORKSHOP_GATE_PASSWORD, { delay: 100 });
  await page.waitForURL(/\/workshops$/, { timeout: 15000 });
}

/**
 * From an already-unlocked `/workshops` calendar page, clicks marked (event-bearing)
 * dates one by one — discovered dynamically from the rendered DOM, never hardcoded —
 * until one reveals at least one non-sold-out event Card, then returns that Card's
 * "Foglalás" (Reserve) link without clicking it, so callers can assert on it first.
 *
 * The calendar (WorkshopCalendar.svelte) renders each day as
 * `<div class="relative"><Calendar.Day />{marker span if it has events}</div>`, so a
 * marker's immediately preceding sibling is always its day's clickable cell
 * (`[data-bits-day]`, bits-ui's Calendar day-cell attribute).
 */
async function findFirstReservableEventLink(page: Page): Promise<Locator> {
  const markers = page.locator('span.bg-primary[aria-hidden="true"]');
  await expect(markers.first()).toBeVisible({ timeout: 15000 });
  const markerCount = await markers.count();
  expect(markerCount).toBeGreaterThan(0);

  for (let i = 0; i < markerCount; i++) {
    const dayCell = markers.nth(i).locator('xpath=preceding-sibling::*[1]');
    await dayCell.click();

    const reserveLink = page.getByRole('link', { name: /foglalás/i }).first();
    if ((await reserveLink.count()) > 0) {
      return reserveLink;
    }
  }

  throw new Error(
    'No reservable (non-sold-out) workshop event found on any marked calendar date — check the dev DB seed.'
  );
}

test.describe.configure({ mode: 'serial' });

test.describe('Workshop ticket purchase flow', () => {
  test('password gate blocks unauthenticated access and unlocks with the correct password', async ({
    page,
  }) => {
    // 1. No gate cookie yet — visiting /workshops redirects to the gate page.
    await page.goto('/workshops');
    await expect(page).toHaveURL(new RegExp(`${WORKSHOP_GATE_PATH}`));
    // Gate copy's CardTitle renders as a plain div (shadcn Card), not a heading element.
    await expect(page.getByText(/workshopok/i).first()).toBeVisible();

    const otpInput = gateOtpInput(page);

    // 2. Wrong password: inline error shown, still on the gate page.
    // A short pause after focusing avoids the very first keystroke landing before the
    // OTP input's focus-triggered re-render settles (observed empirically: the first
    // character was otherwise silently dropped).
    await otpInput.click();
    await page.waitForTimeout(150);
    await otpInput.pressSequentially(WRONG_GATE_PASSWORD, { delay: 100 });
    // The form clears the field back to "" itself once the (failed) request resolves, so
    // asserting the alert (not the transient typed value) is the reliable signal here.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('alert')).toHaveText(/helytelen jelszó/i);
    await expect(page).toHaveURL(new RegExp(`${WORKSHOP_GATE_PATH}`));

    // 3. Correct password, typed through the real OTP UI, unlocks and redirects.
    await otpInput.click();
    await page.waitForTimeout(150);
    await otpInput.pressSequentially(WORKSHOP_GATE_PASSWORD, { delay: 100 });
    await page.waitForURL(/\/workshops$/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/workshops$/);
  });

  test('calendar shows a marked date\'s events and navigates to its reserve page', async ({
    page,
  }) => {
    await unlockWorkshopGate(page);
    await expect(page).toHaveURL(/\/workshops$/);

    const reserveLink = await findFirstReservableEventLink(page);
    // Visible inside an event Card in the clicked day's panel — confirms the panel
    // actually rendered that day's events, not just that a link exists somewhere.
    await expect(reserveLink).toBeVisible();

    await reserveLink.click();
    await page.waitForURL(/\/workshops\/reserve\/[^/?#]+$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/workshops\/reserve\/[^/?#]+$/);
    console.log('Navigated to reserve page:', page.url());
  });

  test('full reserve flow completes a real Barion sandbox payment and returns', async ({ page }) => {
    // Increase timeout for the full payment flow (calendar discovery + real Barion sandbox
    // round trip), same reasoning as checkout.spec.ts's payment test.
    test.setTimeout(150000);

    // Navigated to independently (own discovery pass) rather than continuing test 2's
    // page, since Playwright tests don't share page/context state by default.
    await unlockWorkshopGate(page);
    const reserveLink = await findFirstReservableEventLink(page);
    await reserveLink.click();
    await page.waitForURL(/\/workshops\/reserve\/[^/?#]+$/, { timeout: 15000 });
    console.log('On reserve page:', page.url());

    // The reserve page is reached via a client-side (Astro ClientRouter) soft navigation
    // from the calendar page, whose Svelte island (`client:load`) needs a beat to finish
    // hydrating before its submit handler is wired up. Submitting too early falls through
    // to the browser's native, unhandled form submission (a self-navigation back to this
    // same URL with no order ever created) instead of the real add-to-order/payment flow
    // — verified empirically. A short settle wait avoids that race.
    await page.waitForTimeout(3000);

    // Fill in the name + email fields and submit.
    const [firstName, lastName] = BARION_TEST_CARD.name.split(' ');
    await page.locator('#workshop-reserve-first-name').fill(firstName);
    await page.locator('#workshop-reserve-last-name').fill(lastName);
    const emailInput = page.locator('#workshop-reserve-email');
    await emailInput.fill(BARION_TEST_CARD.emailAddress);

    const submitButton = page.getByRole('button', { name: /tovább a fizetéshez/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Defensive retry: if the click above still raced the island's hydration, we'd be
    // sitting back on the (reset) reserve page instead of navigating away — detect that
    // and retry once before waiting for the real Barion redirect below.
    await page.waitForTimeout(1500);
    if (/\/workshops\/reserve\//.test(page.url())) {
      console.log('Submit did not navigate away yet — retrying once (possible hydration race).');
      await emailInput.fill(BARION_TEST_CARD.emailAddress);
      await submitButton.click();
    }

    // Wait for redirect to the real Barion sandbox gateway.
    await page.waitForURL(/barion\.com/, { timeout: 30000 });
    console.log('Redirected to Barion:', page.url());

    // Fill in card details on Barion's payment page (same sandbox card + defensive
    // multi-selector fallbacks as checkout.spec.ts, since Barion's form layout can vary).
    await page.waitForTimeout(1000);

    await page.locator('input[name="CardNumber"]').fill(BARION_TEST_CARD.number.replace(/\s/g, ''));
    await page.locator('input[name="CardExpiration"]').fill(BARION_TEST_CARD.expiry.replace('/', ''));
    await page
      .locator(
        'input[name*="cvc"], input[name*="cvv"], input[id*="cvc"], input[id*="cvv"], input[placeholder*="CVC"], input[data-testid*="cvc"], #cvc, [name="cvc"]'
      )
      .fill(BARION_TEST_CARD.cvc);
    await page.locator('input[name="CardHolderName"]').fill(BARION_TEST_CARD.name);
    await page.locator('input[name="EmailAddress"]').fill(BARION_TEST_CARD.emailAddress);

    await page.waitForTimeout(1000);

    const paySubmitButton = page
      .locator(
        'button[type="submit"], button:has-text("Pay"), button:has-text("Fizetés"), button:has-text("Confirm"), .pay-button, #payButton'
      )
      .first();
    await expect(paySubmitButton).toBeVisible();
    await paySubmitButton.click();

    // Wait for redirect back to our site. Barion's RedirectUrl is fixed site-wide, so the
    // ticket flow returns to the same barion-return page the physical checkout flow uses.
    await page.waitForURL(/localhost:4321|melindapotondi/, { timeout: 60000 });
    console.log('Redirected back to site:', page.url());

    const currentUrl = page.url();
    expect(currentUrl).toContain('barion-return');
    expect(currentUrl).toMatch(/orderCode=/);

    await page.waitForTimeout(2000);
    console.log('Workshop ticket payment flow completed successfully!');
  });

  test('reserve page shows a not-found state for a bogus event id', async ({ page }) => {
    await unlockWorkshopGate(page);

    const response = await page.goto('/workshops/reserve/999999');
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/nem található/i).first()).toBeVisible();
  });
});

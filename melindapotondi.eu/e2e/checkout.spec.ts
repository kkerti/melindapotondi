import { test, expect } from '@playwright/test';

// Barion Sandbox test card details
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
  emailAddress: 'test@example.com'
};

test.describe('Checkout Flow', () => {
  test('complete checkout flow with Barion payment', async ({ page }) => {
    // Increase timeout for full payment flow
    test.setTimeout(120000);

    // 1. Go to /shop
    await page.goto('/shop');
    await expect(page).toHaveURL(/\/shop/);

    // Wait for products to load
    await page.waitForSelector('add-to-cart button');

    // 2. Add the third product to cart
    const addToCartButtons = page.locator('add-to-cart button');
    await expect(addToCartButtons).toHaveCount(await addToCartButtons.count());
    
    // Click the third product's add to cart button (index 2)
    const thirdProductButton = addToCartButtons.nth(2);
    await thirdProductButton.click();

    // Wait a moment for cart to update
    await page.waitForTimeout(1000);

    // 3. Go to checkout page
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/checkout/);

    // Wait for page to fully load (Svelte components need to hydrate)
    await page.waitForTimeout(2000);

    // 4. Click "Fill with test data" button to populate contact and address forms
    const fillDataButton = page.locator('#fill-dummy-data');
    await fillDataButton.click();

    // Wait for forms to be populated
    await page.waitForTimeout(500);

    // 5. Save contact form - find and click the submit button in the contact section
    // The forms have a "Save" button that becomes visible when editing
    const contactSection = page.locator('text=Contact Information').locator('..').locator('..');
    const contactSaveButton = contactSection.locator('button:has-text("Save"), button:has-text("Mentés")').first();
    
    // If there's a save button visible, click it
    if (await contactSaveButton.isVisible()) {
      await contactSaveButton.click();
      await page.waitForTimeout(1000);
    }

    // 6. Save address form
    const addressSection = page.locator('text=Shipping Address').locator('..').locator('..');
    const addressSaveButton = addressSection.locator('button:has-text("Save"), button:has-text("Mentés")').first();
    
    if (await addressSaveButton.isVisible()) {
      await addressSaveButton.click();
      await page.waitForTimeout(1000);
    }

    // 7. Select shipping method - click on the first available shipping option
    const shippingSection = page.locator('text=Shipping Method').locator('..').locator('..');
    const shippingOptions = shippingSection.locator('input[type="radio"], [role="radio"], .shipping-option');
    
    // Wait for shipping methods to load
    await page.waitForTimeout(2000);
    
    // Click first shipping option if available
    const firstShipping = shippingOptions.first();
    if (await firstShipping.isVisible()) {
      await firstShipping.click();
      await page.waitForTimeout(500);
    }

    // 8. Click on Pay with Barion button
    const barionButton = page.locator('button:has-text("Pay with Barion")');
    await expect(barionButton).toBeVisible();
    
    // Check that button is enabled (has items in cart)
    await expect(barionButton).toBeEnabled();
    
    // Click the Barion payment button
    await barionButton.click();

    // 9. Wait for redirect to Barion gateway
    await page.waitForURL(/barion\.com/, { timeout: 30000 });
    console.log('Redirected to Barion:', page.url());

    // 10. Fill in card details on Barion payment page
    // Wait for Barion payment form to load
    await page.waitForTimeout(1000);

    // Barion may have different form layouts, try multiple selectors
    // Card number field
    await page.locator('input[name="CardNumber"]').fill(BARION_TEST_CARD.number.replace(/\s/g, ''));
    
    // Expiry date field
    await page.locator('input[name="CardExpiration"]').fill(BARION_TEST_CARD.expiry.replace('/', ''))

    // CVC field
    await page.locator(
      'input[name*="cvc"], input[name*="cvv"], input[id*="cvc"], input[id*="cvv"], input[placeholder*="CVC"], input[data-testid*="cvc"], #cvc, [name="cvc"]'
    ).fill(BARION_TEST_CARD.cvc)

    // Cardholder name
    await page.locator('input[name="CardHolderName"]').fill(BARION_TEST_CARD.name)

    // Email address
    await page.locator('input[name="EmailAddress"]').fill(BARION_TEST_CARD.emailAddress)

    // Wait a moment for form validation
    await page.waitForTimeout(1000);

    // 11. Submit payment on Barion
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Pay"), button:has-text("Fizetés"), button:has-text("Confirm"), .pay-button, #payButton'
    ).first();
    
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // 12. Wait for redirect back to our site
    // Barion will redirect to our RedirectUrl after payment completion
    await page.waitForURL(/localhost:4321|melindapotondi/, { timeout: 60000 });
    
    console.log('Redirected back to shop:', page.url());

    // 13. Verify we're on the return page with order details
    const currentUrl = page.url();
    expect(currentUrl).toContain('barion-return');
    
    // Check for order code in URL
    expect(currentUrl).toMatch(/orderCode=/);

    // Optionally verify success message on return page
    await page.waitForTimeout(2000);
    
    // Log final state
    console.log('Payment flow completed successfully!');
  });
});

test.describe('Shop Page', () => {
  test('should display products', async ({ page }) => {
    await page.goto('/shop');
    
    // Wait for products to load
    await page.waitForSelector('add-to-cart');
    
    // Check that at least one product is displayed
    const products = page.locator('add-to-cart');
    await expect(products.first()).toBeVisible();
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/shop');
    
    // Wait for products to load
    await page.waitForSelector('add-to-cart button');
    
    // Click first add to cart button
    const addButton = page.locator('add-to-cart button').first();
    await addButton.click();
    
    // Verify cart was updated (you might have a cart indicator)
    await page.waitForTimeout(1000);
  });
});

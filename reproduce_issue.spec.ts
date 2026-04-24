import { test, expect } from '@playwright/test';

test('reproduce support ticket issue', async ({ page }) => {
  // 1. Log in
  await page.goto('http://localhost:80/auth');
  
  // Fill login form
  // Assuming the fields are email and password based on standard practice
  // and checking artifacts/nexoshop/src/pages/auth.tsx would confirm, but let's try common selectors.
  await page.fill('input[type="email"]', 'dev@nexoshop.test');
  await page.fill('input[type="password"]', 'Dev1234!');
  
  // Click "Se connecter"
  // The user message says click "Se connecter"
  await page.click('button:has-text("Se connecter")');

  // Verify Home page
  // Wait for navigation or a sign that we are logged in
  await page.waitForURL('http://localhost:80/');
  
  console.log('--- Navigated to home page ---');
  
  // (1) Check if products are shown or if it stays loading
  try {
    // Look for product cards or similar
    await page.waitForSelector('.product-card, [class*="product"]', { timeout: 5000 });
    console.log('Products are displayed on home page.');
  } catch (e) {
    console.log('Products NOT found or home page stuck loading.');
  }

  // (2) Navigate to /support
  await page.goto('http://localhost:80/support');
  console.log('--- Navigated to /support ---');

  // Click on "Support" or first ticket category button
  // Based on code: it shows CATEGORY_META. support is the first one.
  // button text contains "Support"
  await page.click('button:has-text("Support")');
  console.log('Clicked Support category');

  // Fill dialog
  await page.fill('input[placeholder*="ex : Question"]', 'Test sujet');
  await page.fill('textarea[placeholder*="Décris ta demande"]', 'Test message');

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  // Listen for network failures
  page.on('requestfailed', request => {
    console.log('NETWORK REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('NETWORK RESPONSE ERROR:', response.status(), response.url());
    }
  });

  // Click "Envoyer"
  await page.click('button:has-text("Envoyer")');
  console.log('Clicked Envoyer');

  // Wait for toast or error message
  // The code uses sonner toast.error(msg ?? "Erreur lors de la création")
  // Let's look for text that appears.
  try {
    const errorMessage = await page.waitForSelector('[role="status"]', { timeout: 5000 });
    const text = await errorMessage.innerText();
    console.log('TOAST MESSAGE DETECTED:', text);
  } catch (e) {
    console.log('No toast detected or timed out');
  }

  // Capture screenshot
  await page.screenshot({ path: 'reproduction_screenshot.png' });
  console.log('Screenshot captured as reproduction_screenshot.png');
});

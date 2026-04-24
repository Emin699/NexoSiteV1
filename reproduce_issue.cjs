const { chromium } = require('/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- Starting Reproduction Script ---');

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

  try {
    // 1. Log in
    console.log('Navigating to http://localhost:80/auth...');
    await page.goto('http://localhost:80/auth');
    
    console.log('Filling login form...');
    await page.fill('input[type="email"]', 'dev@nexoshop.test');
    await page.fill('input[type="password"]', 'Dev1234!');
    
    console.log('Clicking "Se connecter"...');
    await page.click('button:has-text("Se connecter")');

    // Wait for navigation
    console.log('Waiting for navigation to home page...');
    await page.waitForURL('http://localhost:80/', { timeout: 15000 });
    console.log('--- Navigated to home page ---');
    
    // (1) Check if products are shown
    try {
      await page.waitForSelector('button:has-text("Acheter"), .product-card, [class*="product"]', { timeout: 10000 });
      console.log('Products are displayed on home page.');
    } catch (e) {
      console.log('Products NOT found or home page stuck loading.');
    }

    // (2) Navigate to /support
    console.log('Navigating to /support...');
    await page.goto('http://localhost:80/support');
    await page.waitForLoadState('networkidle');
    console.log('--- Navigated to /support ---');

    // Click on "Support" or first ticket category button
    console.log('Clicking Support category...');
    await page.click('button:has-text("Support")');

    // Fill dialog
    console.log('Filling ticket form...');
    await page.fill('input[placeholder*="ex : Question"]', 'Test sujet');
    await page.fill('textarea[placeholder*="Décris ta demande"]', 'Test message');

    // Click "Envoyer"
    console.log('Clicking "Envoyer"...');
    await page.click('button:has-text("Envoyer")');

    // Wait for toast or error message
    console.log('Waiting for toast response...');
    try {
      // sonner uses [data-sonner-toast] or just look for the text
      const toast = await page.waitForSelector('[role="status"], [data-sonner-toast]', { timeout: 10000 });
      const text = await toast.innerText();
      console.log('TOAST MESSAGE DETECTED:', text);
    } catch (e) {
      console.log('No toast detected or timed out');
    }

    // Capture screenshot
    await page.screenshot({ path: 'reproduction_screenshot.png' });
    console.log('Screenshot captured as reproduction_screenshot.png');

  } catch (err) {
    console.error('An error occurred during reproduction:', err);
  } finally {
    await browser.close();
  }
})();

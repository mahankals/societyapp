const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 180000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'https://societyapp.ddev.site',
    ignoreHTTPSErrors: true,
    video: {
      mode: 'on',
      size: { width: 1280, height: 800 },
    },
    viewport: { width: 1280, height: 800 },
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  outputDir: './references/videos/raw-results',
});

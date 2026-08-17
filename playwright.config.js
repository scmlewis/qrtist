const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'ui.spec.js',
  timeout: 30000,
  use: {
    headless: true,
  },
  webServer: {
    command: 'npx http-server . -p 8080 --cors',
    port: 8080,
    reuseExistingServer: true,
    timeout: 10000,
  },
});

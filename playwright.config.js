const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'verify.spec.js',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  webServer: {
    command: 'npx http-server . -p 8080 --cors',
    port: 8080,
    reuseExistingServer: true,
    timeout: 15000,
  },
});

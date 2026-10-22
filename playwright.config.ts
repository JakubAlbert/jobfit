import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run the production build in a real browser.
// Locally they use the installed Microsoft Edge, so no extra browser download is needed;
// CI installs Playwright's Chromium (see .github/workflows/ci.yml).
const isCi = Boolean(process.env.CI)
const browser = isCi ? {} : { channel: 'msedge' }

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4175/jobfit/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...browser }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browser }, grep: /@mobile/ },
  ],
  webServer: {
    // Serves the existing build (run `npm run build` first; CI does).
    command: 'npx vite preview --port 4175 --strictPort',
    url: 'http://localhost:4175/jobfit/',
    reuseExistingServer: !isCi,
  },
})

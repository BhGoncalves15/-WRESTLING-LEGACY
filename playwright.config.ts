import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4198'
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const chromium = executablePath ? { launchOptions: { executablePath } } : {}
const previewBuild = process.env.PLAYWRIGHT_BUILD === '1'

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60_000,
  workers: 2,
  use: { baseURL: previewBuild ? baseURL + '/-WRESTLING-LEGACY/' : baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...chromium } },
    { name: 'android', use: { ...devices['Pixel 7'], ...chromium } },
    ...(process.env.PLAYWRIGHT_WEBKIT === '1' ? [{ name: 'iphone', use: { ...devices['iPhone 13'] } }] : []),
  ],
  webServer: {
    command: 'npm run ' + (previewBuild ? 'preview' : 'dev') + ' -- --host 127.0.0.1 --port 4198 --strictPort',
    url: previewBuild ? baseURL + '/-WRESTLING-LEGACY/' : baseURL,
    reuseExistingServer: !process.env.CI,
  },
})

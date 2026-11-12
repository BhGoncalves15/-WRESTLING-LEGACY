import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/-WRESTLING-LEGACY/' : '/',
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}))

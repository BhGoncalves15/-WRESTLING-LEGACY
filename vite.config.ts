import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/-WRESTLING-LEGACY/' : '/',
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}))

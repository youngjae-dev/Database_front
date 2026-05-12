import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// 개발: 브라우저는 /api/* 로 요청 → Vite가 VITE_PROXY_TARGET(기본 http://localhost:8080)으로 전달합니다.
// Spring `@RequestMapping("/api/auth")` 처럼 경로에 /api 가 포함되면 접두사를 제거하면 안 됩니다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'
  const apiPrefix = env.VITE_API_PREFIX || '/api'
  const stripApiPrefix = env.VITE_PROXY_STRIP_PREFIX === 'true'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      headers: {
        'Cache-Control': 'no-store',
      },
      proxy: {
        [apiPrefix]: {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: stripApiPrefix
            ? (p) => {
                const stripped = p.slice(apiPrefix.length) || '/'
                return stripped.startsWith('/') ? stripped : `/${stripped}`
              }
            : undefined,
        },
      },
    },
  }
})

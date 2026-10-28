export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'ws://localhost/realtime',
  enableMocks: import.meta.env.VITE_ENABLE_MOCKS !== 'false',
} as const

import { json, route } from '../http'
import { realtimeHandler } from '../realtime'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { orderHandlers } from './orders'

export const handlers = [
  route('GET', '/health', () => json({ status: 'ok' })),
  ...authHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  realtimeHandler,
]

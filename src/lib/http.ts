import axios from 'axios'
import { env } from './env'

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

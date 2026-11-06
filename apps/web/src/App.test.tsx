import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('App authentication', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('registers the first account and opens the dashboard', async () => {
    const product = {
      id: 'product-1',
      name: 'Caderno artesanal',
      description: null,
      stockQuantity: 4,
      unitPrice: '15.50',
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/auth/setup')) {
        return jsonResponse({ registrationAvailable: true })
      }
      if (url.endsWith('/auth/register')) {
        expect(init?.method).toBe('POST')
        expect(JSON.parse(String(init?.body))).toEqual({
          email: 'owner@example.com',
          password: 'a-secure-password',
          setupSecret: 'private-setup-code',
        })
        return jsonResponse({
          accessToken: 'session-token',
          user: { id: 'user-1', email: 'owner@example.com' },
        })
      }
      if (url.endsWith('/auth/me')) {
        return jsonResponse({ id: 'user-1', email: 'owner@example.com' })
      }
      if (url.endsWith('/products')) return jsonResponse([product])
      if (url.endsWith('/sales')) return jsonResponse([])
      if (url.includes('/reports/monthly-sales')) {
        return jsonResponse({
          year: new Date().getFullYear(),
          months: Array.from({ length: 12 }, (_, index) => ({
            month: index + 1,
            total: '0',
            salesCount: 0,
          })),
        })
      }
      throw new Error(`Unexpected API request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('Primeiro acesso à loja?')
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Código de configuração'), {
      target: { value: 'private-setup-code' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'a-secure-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await screen.findByText('owner@example.com')
    expect(sessionStorage.getItem('artemis-token')).toBe('session-token')
    fireEvent.click(screen.getByRole('button', { name: /Produtos/ }))
    await screen.findByText('Caderno artesanal')

    expect(fetchMock).toHaveBeenCalled()
  })

  it('shows API login errors without creating a session', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/auth/setup')) {
        return jsonResponse({ registrationAvailable: false })
      }
      return jsonResponse({ message: 'Credenciais inválidas.' }, 401)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'wrong-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Credenciais inválidas.')
    })
    expect(sessionStorage.getItem('artemis-token')).toBeNull()
  })
})

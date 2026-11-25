import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '../lib/api'
import type { Session } from '../types'

export function AuthPage({
  initialError,
  onAuthenticated,
}: {
  initialError?: string
  onAuthenticated: (session: Session) => void
}) {
  const [registering, setRegistering] = useState(false)
  const [registrationAvailable, setRegistrationAvailable] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [setupSecret, setSetupSecret] = useState('')
  const [error, setError] = useState(initialError ?? '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    void request<{ registrationAvailable: boolean }>('/auth/setup')
      .then((status) => {
        if (mounted) {
          setRegistrationAvailable(status.registrationAvailable)
        }
      })
      .catch((caught: unknown) => {
        if (mounted) {
          setError((caught as Error).message || 'Não foi possível conectar à API.')
        }
      })
      .finally(() => {
        if (mounted) setCheckingSetup(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const session = await request<Session>(
        registering ? '/auth/register' : '/auth/login',
        undefined,
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            ...(registering && { setupSecret }),
          }),
        },
      )
      onAuthenticated(session)
    } catch (caught) {
      setError((caught as Error).message || 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <a className="brand auth-brand" href="/" aria-label="Artemis, início">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>Artemis</span>
        </a>
        <div className="auth-message">
          <p className="eyebrow">CASA DA ARTE</p>
          <h1>Mais tempo criando. Tudo em ordem.</h1>
          <p>Um jeito tranquilo de cuidar do estoque, registrar vendas e acompanhar o que acontece na loja.</p>
        </div>
        <span className="auth-decoration decoration-one" aria-hidden="true">✳</span>
        <span className="auth-decoration decoration-two" aria-hidden="true">✿</span>
        <footer>Feito para a Casa da Arte, com cuidado e clareza.</footer>
      </section>
      <section className="auth-form-area">
        <div className="auth-card">
          <p className="eyebrow">{registering ? 'COMECE POR AQUI' : 'BEM-VINDA DE VOLTA'}</p>
          <h2>{registering ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
          <p className="auth-subtitle">
            {registering
              ? 'Cadastre o acesso inicial da loja com seu e-mail e uma senha segura.'
              : 'Acesse seu espaço para continuar de onde parou.'}
          </p>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <form className="auth-form" onSubmit={submit}>
            <label className="field">
              E-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                required
                maxLength={254}
                autoFocus
              />
            </label>
            {registering && (
              <label className="field">
                Código de configuração
                <input
                  type="password"
                  autoComplete="off"
                  value={setupSecret}
                  onChange={(event) => setSetupSecret(event.target.value)}
                  required
                  maxLength={256}
                />
              </label>
            )}
            <label className="field">
              Senha
              <input
                type="password"
                autoComplete={registering ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Pelo menos 10 caracteres"
                required
                minLength={registering ? 10 : 1}
                maxLength={128}
              />
            </label>
            <button className="button button-primary auth-submit" disabled={busy}>
              {busy ? 'Aguarde...' : registering ? 'Criar conta' : 'Entrar'}
            </button>
          </form>
          {!checkingSetup && registrationAvailable && (
            <p className="auth-switch">
              {registering ? 'Já tem uma conta?' : 'Primeiro acesso à loja?'}{' '}
              <button
                className="text-button"
                onClick={() => {
                  setRegistering(!registering)
                  setError('')
                  setSetupSecret('')
                }}
              >
                {registering ? 'Entrar' : 'Criar conta'}
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

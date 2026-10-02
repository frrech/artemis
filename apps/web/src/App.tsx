import { useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  status: 'ok'
  service: string
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === 'ok' &&
    'service' in value &&
    typeof value.service === 'string'
  )
}

function App() {
  const [apiStatus, setApiStatus] = useState('Verificando conexão...')

  useEffect(() => {
    const controller = new AbortController()

    async function checkApi() {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`A API respondeu com HTTP ${response.status}`)
        }

        const data: unknown = await response.json()
        if (!isHealthResponse(data)) {
          throw new Error('A resposta da API está em formato inesperado')
        }
        setApiStatus('API conectada')
      } catch (error) {
        if (!controller.signal.aborted) {
          setApiStatus('API indisponível. Inicie a API e o banco de dados.')
          console.error('Não foi possível verificar a API:', error)
        }
      }
    }

    void checkApi()
    return () => controller.abort()
  }, [])

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Artemis, início">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>Artemis</span>
        </a>
        <span className="topbar-label">Controle de estoque</span>
      </header>

      <section className="welcome" aria-labelledby="welcome-title">
        <p className="eyebrow">CASA DA ARTE</p>
        <h1 id="welcome-title">Tudo em ordem, para você focar no que cria.</h1>
        <p className="intro">
          Um espaço simples para acompanhar produtos, vendas e o que merece
          atenção na loja.
        </p>
        <div className="status" role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {apiStatus}
        </div>
      </section>

      <section className="next" aria-labelledby="next-title">
        <div>
          <p className="eyebrow">PRÓXIMOS PASSOS</p>
          <h2 id="next-title">Uma base pronta para crescer</h2>
          <p>
            O projeto está preparado para conectar o cadastro de produtos,
            registro de vendas e resumos mensais.
          </p>
        </div>
        <ul>
          <li>Produtos e estoque</li>
          <li>Registro de vendas</li>
          <li>Resumo mensal</li>
        </ul>
      </section>

      <footer>Feito para a Casa da Arte, com cuidado e clareza.</footer>
    </main>
  )
}

export default App

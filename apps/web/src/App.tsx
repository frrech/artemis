import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { AuthPage } from './components/AuthPage'
import { Overview } from './components/Overview'
import { ProductsView } from './components/ProductsView'
import { SalesView } from './components/SalesView'
import { NavButton } from './components/Shared'
import { request } from './lib/api'
import type { ApiError } from './lib/api'
import type {
  MonthlySales,
  Product,
  Sale,
  Section,
  Session,
  User,
} from './types'

function sectionTitle(section: Section) {
  if (section === 'products') return 'Produtos'
  if (section === 'sales') return 'Vendas'
  return 'Bom ter você por aqui.'
}

function sectionDescription(section: Section) {
  if (section === 'products') return 'Cuide do seu catálogo e acompanhe o estoque.'
  if (section === 'sales') return 'Registre cada venda e mantenha o estoque atualizado.'
  return 'Acompanhe o movimento da loja com tranquilidade.'
}

function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem('artemis-token') || '',
  )
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [monthlySales, setMonthlySales] = useState<MonthlySales | null>(null)
  const [section, setSection] = useState<Section>('overview')
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [currentUser, currentProducts, currentSales, report] =
        await Promise.all([
          request<User>('/auth/me', token),
          request<Product[]>('/products', token),
          request<Sale[]>('/sales', token),
          request<MonthlySales>(
            `/reports/monthly-sales?year=${new Date().getFullYear()}`,
            token,
          ),
        ])
      setUser(currentUser)
      setProducts(currentProducts)
      setSales(currentSales)
      setMonthlySales(report)
    } catch (caught) {
      const failure = caught as ApiError
      if (failure.status === 401) {
        sessionStorage.removeItem('artemis-token')
        setToken('')
        setUser(null)
        setError('Sua sessão expirou. Entre novamente.')
      } else {
        setError(failure.message || 'Não foi possível carregar os dados.')
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    let active = true
    if (token) {
      void Promise.resolve().then(() => {
        if (active) void loadDashboard()
      })
    }
    return () => {
      active = false
    }
  }, [token, loadDashboard])

  const currentMonthTotal = useMemo(() => {
    const month = new Date().getMonth() + 1
    return monthlySales?.months.find((item) => item.month === month)?.total ?? '0'
  }, [monthlySales])

  async function signIn(session: Session) {
    sessionStorage.setItem('artemis-token', session.accessToken)
    setToken(session.accessToken)
    setUser(session.user)
    setError('')
  }

  function signOut() {
    sessionStorage.removeItem('artemis-token')
    setToken('')
    setUser(null)
    setProducts([])
    setSales([])
    setMonthlySales(null)
    setNotice('')
    setError('')
  }

  async function reportAction(action: () => Promise<void>, success: string) {
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(success)
      await loadDashboard()
    } catch (caught) {
      setError((caught as Error).message || 'Não foi possível concluir a ação.')
    }
  }

  if (loading && !user) {
    return (
      <main className="loading-screen" role="status">
        <span className="brand-mark" aria-hidden="true">A</span>
        <p>Preparando seu espaço...</p>
      </main>
    )
  }

  if (token && !user) {
    return (
      <main className="loading-screen">
        <span className="brand-mark" aria-hidden="true">A</span>
        <p role="alert">{error || 'Não foi possível carregar seus dados.'}</p>
        <button className="button button-primary" onClick={() => void loadDashboard()}>
          Tentar novamente
        </button>
        <button className="text-button" onClick={signOut}>Sair</button>
      </main>
    )
  }

  if (!token) {
    return <AuthPage initialError={error} onAuthenticated={signIn} />
  }

  if (!user) {
    return (
      <main className="loading-screen">
        <p role="alert">Não foi possível validar sua sessão.</p>
        <button className="button button-quiet" onClick={signOut}>Sair</button>
      </main>
    )
  }

  const needsRestock = products.filter((product) => product.stockQuantity <= 3)

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Artemis, início">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>Artemis</span>
        </a>
        <div className="account-area">
          <span className="account-email">{user.email}</span>
          <button className="button button-quiet" onClick={signOut}>
            Sair
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Navegação principal">
          <p className="eyebrow">CASA DA ARTE</p>
          <nav className="navigation">
            <NavButton
              active={section === 'overview'}
              onClick={() => setSection('overview')}
            >
              Visão geral
            </NavButton>
            <NavButton
              active={section === 'products'}
              onClick={() => setSection('products')}
            >
              Produtos
              <span className="nav-count">{products.length}</span>
            </NavButton>
            <NavButton
              active={section === 'sales'}
              onClick={() => setSection('sales')}
            >
              Vendas
              <span className="nav-count">{sales.length}</span>
            </NavButton>
          </nav>
          <div className="sidebar-note">
            <span className="note-icon" aria-hidden="true">✳</span>
            <p>Um passo de cada vez. Seus dados estão organizados.</p>
          </div>
        </aside>

        <section className="main-content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">SEU ATELIÊ, EM ORDEM</p>
              <h1>{sectionTitle(section)}</h1>
              <p className="page-description">{sectionDescription(section)}</p>
            </div>
            {section === 'products' && (
              <button
                className="button button-primary"
                onClick={() => setEditingProduct({} as Product)}
              >
                <span aria-hidden="true">＋</span> Novo produto
              </button>
            )}
            {section === 'sales' && (
              <button
                className="button button-primary"
                onClick={() => setEditingSale({} as Sale)}
                disabled={products.length === 0}
              >
                <span aria-hidden="true">＋</span> Registrar venda
              </button>
            )}
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}

          {section === 'overview' && (
            <Overview
              products={products}
              sales={sales}
              monthlySales={monthlySales}
              currentMonthTotal={currentMonthTotal}
              needsRestock={needsRestock}
              onViewProducts={() => setSection('products')}
            />
          )}
          {section === 'products' && (
            <ProductsView
              products={products}
              editingProduct={editingProduct}
              onEdit={setEditingProduct}
              onCancel={() => setEditingProduct(null)}
              onSave={(input) =>
                reportAction(async () => {
                  if (editingProduct?.id) {
                    await request(`/products/${editingProduct.id}`, token, {
                      method: 'PATCH',
                      body: JSON.stringify(input),
                    })
                  } else {
                    await request('/products', token, {
                      method: 'POST',
                      body: JSON.stringify(input),
                    })
                  }
                  setEditingProduct(null)
                }, editingProduct?.id ? 'Produto atualizado.' : 'Produto adicionado.')
              }
              onDelete={(product) => {
                if (!window.confirm(`Remover o produto "${product.name}"?`)) return
                void reportAction(
                  async () => {
                    await request(`/products/${product.id}`, token, { method: 'DELETE' })
                  },
                  'Produto removido.',
                )
              }}
            />
          )}
          {section === 'sales' && (
            <SalesView
              sales={sales}
              products={products}
              editingSale={editingSale}
              onEdit={setEditingSale}
              onCancel={() => setEditingSale(null)}
              onSave={(input) =>
                reportAction(async () => {
                  const payload = {
                    ...input,
                    soldAt: new Date(input.soldAt).toISOString(),
                  }
                  if (editingSale?.id) {
                    await request(`/sales/${editingSale.id}`, token, {
                      method: 'PATCH',
                      body: JSON.stringify(payload),
                    })
                  } else {
                    await request('/sales', token, {
                      method: 'POST',
                      body: JSON.stringify(payload),
                    })
                  }
                  setEditingSale(null)
                }, editingSale?.id ? 'Venda atualizada.' : 'Venda registrada.')
              }
              onDelete={(sale) => {
                if (!window.confirm('Remover esta venda e devolver ao estoque?')) return
                void reportAction(
                  async () => {
                    await request(`/sales/${sale.id}`, token, { method: 'DELETE' })
                  },
                  'Venda removida e estoque atualizado.',
                )
              }}
            />
          )}
        </section>
      </div>
    </main>
  )
}

export default App

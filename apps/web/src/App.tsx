import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'

type User = { id: string; email: string }
type Product = {
  id: string
  name: string
  description: string | null
  stockQuantity: number
  unitPrice: string
}
type Sale = {
  id: string
  productId: string
  quantity: number
  unitPrice: string
  soldAt: string
  product: Product
}
type MonthlySales = {
  year: number
  months: { month: number; total: string; salesCount: number }[]
}
type Session = { accessToken: string; user: User }
type Section = 'overview' | 'products' | 'sales'
type ApiError = Error & { status?: number }

const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const today = new Date()
const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

async function request<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBase}${path}`, { ...options, headers })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    let message = `A solicitação falhou (HTTP ${response.status}).`
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      if (typeof payload.message === 'string') {
        message = payload.message
      } else if (Array.isArray(payload.message)) {
        const details = payload.message.filter(
          (item): item is string => typeof item === 'string',
        )
        if (details.length > 0) message = details.join(' ')
      }
    }
    const error = new Error(message) as ApiError
    error.status = response.status
    throw error
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function currency(value: string | number) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function toDateTimeInput(value?: string) {
  const date = value ? new Date(value) : new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
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
    const month = today.getMonth() + 1
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
                    await request(`/products/${product.id}`, token, {
                      method: 'DELETE',
                    })
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
                    await request(`/sales/${sale.id}`, token, {
                      method: 'DELETE',
                    })
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

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      className={`nav-button${active ? ' active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Overview({
  products,
  sales,
  monthlySales,
  currentMonthTotal,
  needsRestock,
  onViewProducts,
}: {
  products: Product[]
  sales: Sale[]
  monthlySales: MonthlySales | null
  currentMonthTotal: string
  needsRestock: Product[]
  onViewProducts: () => void
}) {
  const maximum = Math.max(
    1,
    ...(monthlySales?.months.map((item) => Number(item.total)) ?? []),
  )
  const recentSales = sales.slice(0, 4)

  return (
    <>
      <div className="stats-grid">
        <StatCard label="Produtos cadastrados" value={products.length.toString()} detail="No seu catálogo" icon="◇" />
        <StatCard label="Vendas este mês" value={currency(currentMonthTotal)} detail={`${monthlySales?.months[today.getMonth()]?.salesCount ?? 0} vendas registradas`} icon="↗" />
        <StatCard label="Precisam de atenção" value={needsRestock.length.toString()} detail="Produtos com até 3 unidades" icon="!" highlight={needsRestock.length > 0} />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel" aria-labelledby="report-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ACOMPANHAMENTO</p>
              <h2 id="report-title">Vendas por mês</h2>
            </div>
            <span className="year-label">{monthlySales?.year ?? today.getFullYear()}</span>
          </div>
          <div className="chart" role="list" aria-label="Totais mensais de vendas">
            {(monthlySales?.months ?? []).map((item) => (
              <div
                className="chart-column"
                role="listitem"
                key={item.month}
                aria-label={`${monthNames[item.month - 1]}: ${currency(item.total)}`}
              >
                <span className="chart-value">
                  {Number(item.total) > 0 ? currency(item.total) : ''}
                </span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      height: `${Math.max(4, (Number(item.total) / maximum) * 100)}%`,
                    }}
                  />
                </div>
                <span className="chart-month">{monthNames[item.month - 1].slice(0, 3)}</span>
              </div>
            ))}
            {!monthlySales && <p className="empty-copy">Carregando resumo...</p>}
          </div>
        </section>

        <section className="panel attention-panel" aria-labelledby="attention-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ESTOQUE</p>
              <h2 id="attention-title">Para ficar de olho</h2>
            </div>
            <button className="text-button" onClick={onViewProducts}>Ver produtos</button>
          </div>
          {needsRestock.length === 0 ? (
            <p className="empty-copy">Tudo certo: nenhum produto com estoque baixo.</p>
          ) : (
            <ul className="attention-list">
              {needsRestock.slice(0, 5).map((product) => (
                <li key={product.id}>
                  <span className="product-avatar" aria-hidden="true">{product.name.slice(0, 1).toUpperCase()}</span>
                  <span className="attention-name">{product.name}</span>
                  <span className="stock-pill">{product.stockQuantity} un.</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel recent-panel" aria-labelledby="recent-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">MOVIMENTO</p>
            <h2 id="recent-title">Vendas recentes</h2>
          </div>
        </div>
        <SalesTable sales={recentSales} emptyMessage="As vendas registradas aparecerão aqui." />
      </section>
      <footer className="app-footer">Feito para a Casa da Arte, com cuidado e clareza.</footer>
    </>
  )
}

function StatCard({
  label,
  value,
  detail,
  icon,
  highlight = false,
}: {
  label: string
  value: string
  detail: string
  icon: string
  highlight?: boolean
}) {
  return (
    <article className={`stat-card${highlight ? ' stat-attention' : ''}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon" aria-hidden="true">{icon}</span>
      </div>
      <strong>{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  )
}

function ProductsView({
  products,
  editingProduct,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  products: Product[]
  editingProduct: Product | null
  onEdit: (product: Product) => void
  onCancel: () => void
  onSave: (input: {
    name: string
    description?: string
    stockQuantity: number
    unitPrice: number
  }) => void
  onDelete: (product: Product) => void
}) {
  return (
    <>
      {editingProduct && (
        <ProductForm
          product={editingProduct.id ? editingProduct : undefined}
          onCancel={onCancel}
          onSave={onSave}
        />
      )}
      {products.length === 0 ? (
        <EmptyState
          title="Seu catálogo começa aqui"
          description="Cadastre seu primeiro produto para acompanhar quantidades e vendas."
        />
      ) : (
        <section className="product-grid" aria-label="Lista de produtos">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-card-top">
                <span className="product-avatar large" aria-hidden="true">{product.name.slice(0, 1).toUpperCase()}</span>
                <span className={product.stockQuantity <= 3 ? 'stock-pill low-stock' : 'stock-pill'}>
                  {product.stockQuantity} em estoque
                </span>
              </div>
              <h2>{product.name}</h2>
              <p className="product-description">{product.description || 'Sem descrição'}</p>
              <div className="product-card-bottom">
                <strong>{currency(product.unitPrice)}</strong>
                <div className="inline-actions">
                  <button className="text-button" onClick={() => onEdit(product)}>Editar</button>
                  <button className="text-button danger-text" onClick={() => onDelete(product)}>Remover</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}

function ProductForm({
  product,
  onCancel,
  onSave,
}: {
  product?: Product
  onCancel: () => void
  onSave: (input: {
    name: string
    description?: string
    stockQuantity: number
    unitPrice: number
  }) => void
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity.toString() ?? '0')
  const [unitPrice, setUnitPrice] = useState(product?.unitPrice ?? '')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      name: name.trim(),
      description: description.trim(),
      stockQuantity: Number(stockQuantity),
      unitPrice: Number(unitPrice),
    })
  }

  return (
    <form className="panel edit-form" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CATÁLOGO</p>
          <h2>{product ? 'Editar produto' : 'Novo produto'}</h2>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          Nome do produto
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoFocus />
        </label>
        <label className="field">
          Preço por unidade (R$)
          <input type="number" min="0.01" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required />
        </label>
        <label className="field">
          Quantidade em estoque
          <input type="number" min="0" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} required />
        </label>
        <label className="field field-wide">
          Descrição <span className="field-optional">(opcional)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancelar</button>
        <button className="button button-primary" type="submit">Salvar produto</button>
      </div>
    </form>
  )
}

function SalesView({
  sales,
  products,
  editingSale,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  sales: Sale[]
  products: Product[]
  editingSale: Sale | null
  onEdit: (sale: Sale) => void
  onCancel: () => void
  onSave: (input: { productId: string; quantity: number; soldAt: string }) => void
  onDelete: (sale: Sale) => void
}) {
  return (
    <>
      {editingSale && (
        <SaleForm
          sale={editingSale.id ? editingSale : undefined}
          products={products}
          onCancel={onCancel}
          onSave={onSave}
        />
      )}
      {sales.length === 0 ? (
        <EmptyState
          title="Nenhuma venda registrada ainda"
          description="Quando uma venda acontecer, registre aqui. O estoque será atualizado automaticamente."
        />
      ) : (
        <section className="panel table-panel">
          <SalesTable
            sales={sales}
            onEdit={onEdit}
            onDelete={onDelete}
            emptyMessage="Nenhuma venda registrada."
          />
        </section>
      )}
    </>
  )
}

function SaleForm({
  sale,
  products,
  onCancel,
  onSave,
}: {
  sale?: Sale
  products: Product[]
  onCancel: () => void
  onSave: (input: { productId: string; quantity: number; soldAt: string }) => void
}) {
  const [productId, setProductId] = useState(sale?.productId ?? products[0]?.id ?? '')
  const [quantity, setQuantity] = useState(sale?.quantity.toString() ?? '1')
  const [soldAt, setSoldAt] = useState(toDateTimeInput(sale?.soldAt))
  const selectedProduct = products.find((product) => product.id === productId)
  const available = (selectedProduct?.stockQuantity ?? 0) + (sale?.productId === productId ? sale.quantity : 0)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ productId, quantity: Number(quantity), soldAt })
  }

  return (
    <form className="panel edit-form" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">REGISTRO DE VENDAS</p>
          <h2>{sale ? 'Editar venda' : 'Nova venda'}</h2>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          Produto
          <select value={productId} onChange={(event) => setProductId(event.target.value)} required>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — {product.stockQuantity} un. — {currency(product.unitPrice)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Quantidade {selectedProduct && <span className="field-optional">(disponível: {available})</span>}
          <input type="number" min="1" max={available || undefined} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
        </label>
        <label className="field">
          Data e hora
          <input type="datetime-local" value={soldAt} onChange={(event) => setSoldAt(event.target.value)} required />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={!selectedProduct}>Salvar venda</button>
      </div>
    </form>
  )
}

function SalesTable({
  sales,
  onEdit,
  onDelete,
  emptyMessage,
}: {
  sales: Sale[]
  onEdit?: (sale: Sale) => void
  onDelete?: (sale: Sale) => void
  emptyMessage: string
}) {
  if (sales.length === 0) return <p className="empty-copy table-empty">{emptyMessage}</p>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Produto</th>
            <th scope="col">Data</th>
            <th scope="col">Quantidade</th>
            <th scope="col">Total</th>
            {(onEdit || onDelete) && <th scope="col">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td data-label="Produto">{sale.product.name}</td>
              <td data-label="Data">{new Date(sale.soldAt).toLocaleDateString('pt-BR')}</td>
              <td data-label="Quantidade">{sale.quantity} un.</td>
              <td data-label="Total"><strong>{currency(Number(sale.unitPrice) * sale.quantity)}</strong></td>
              {(onEdit || onDelete) && (
                <td data-label="Ações">
                  <div className="inline-actions">
                    {onEdit && <button className="text-button" onClick={() => onEdit(sale)}>Editar</button>}
                    {onDelete && <button className="text-button danger-text" onClick={() => onDelete(sale)}>Remover</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-illustration" aria-hidden="true">✳</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

function AuthPage({
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
        if (mounted) setRegistrationAvailable(status.registrationAvailable)
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

export default App

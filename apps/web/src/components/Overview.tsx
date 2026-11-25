import { currency, monthNames } from '../lib/format'
import type { MonthlySales, Product, Sale } from '../types'
import { SalesTable, StatCard } from './Shared'

export function Overview({
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
  const today = new Date()
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

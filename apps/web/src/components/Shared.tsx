import type { ReactNode } from 'react'
import { currency } from '../lib/format'
import type { Sale } from '../types'

export function NavButton({
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

export function StatCard({
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

export function SalesTable({
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

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-illustration" aria-hidden="true">✳</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

import { useState } from 'react'
import type { FormEvent } from 'react'
import { currency, toDateTimeInput } from '../lib/format'
import type { Product, Sale } from '../types'
import { EmptyState, SalesTable } from './Shared'

export function SalesView({
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

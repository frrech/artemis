import { useState } from 'react'
import type { FormEvent } from 'react'
import { currency } from '../lib/format'
import type { Product } from '../types'
import { EmptyState } from './Shared'

export function ProductsView({
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

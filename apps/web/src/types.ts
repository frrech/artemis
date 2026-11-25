export type User = { id: string; email: string }

export type Product = {
  id: string
  name: string
  description: string | null
  stockQuantity: number
  unitPrice: string
}

export type Sale = {
  id: string
  productId: string
  quantity: number
  unitPrice: string
  soldAt: string
  product: Product
}

export type MonthlySales = {
  year: number
  months: { month: number; total: string; salesCount: number }[]
}

export type Session = { accessToken: string; user: User }
export type Section = 'overview' | 'products' | 'sales'

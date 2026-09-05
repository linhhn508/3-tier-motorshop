import { http, HttpResponse } from 'msw'
import { mockProducts, mockCategories, mockProductDetail } from './data'

export const mockFeedbackList = [
  { name: 'Trần Minh Khoa', rating: 5, comment: 'Chất lượng tuyệt vời!' },
  { name: 'Nguyễn Thị Lan', rating: 4, comment: 'Sản phẩm tốt, giao hàng nhanh.' },
]

export const handlers = [
  http.get('/api/products/', () => {
    return HttpResponse.json(mockProducts)
  }),

  http.get('/api/products/categories/', () => {
    return HttpResponse.json(mockCategories)
  }),

  http.get('/api/products/:id/info', ({ params }) => {
    if (params.id === mockProductDetail.id) {
      return HttpResponse.json(mockProductDetail)
    }
    return new HttpResponse(null, { status: 404 })
  }),

  http.get('/api/feedback/', () => {
    return HttpResponse.json([
        { id: 1, name: 'Tran Minh Khoa', rating: 5, comment: 'Tuyet voi!', product_id: 'lop-michelin-city-grip-2' },
        { id: 2, name: 'Nguyen Thi Lan', rating: 4, comment: 'San pham tot.', product_id: 'po-akrapovic-r1' },
    ])
  }),

  http.get('/api/feedback/:productId', ({ params }) => {
    if (params.productId === mockProductDetail.id) {
      return HttpResponse.json(mockFeedbackList)
    }
    return HttpResponse.json([])
  }),

  http.post('/api/contacts/', () => {
    return HttpResponse.json({ message: 'ok' })
  }),

  http.post('/api/feedback/', () => {
    return HttpResponse.json({ message: 'ok' })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json()
    if (body.username === 'admin' && body.password === 'admin123') {
        return HttpResponse.json({ token: 'mock-jwt-token' })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  http.get('/api/contacts/', () => {
    return HttpResponse.json([
        { id: 1, name: 'Test User', email: 'test@test.com', phone: '123', subject: 'Hi', message: 'Hello' },
    ])
  }),

  http.post('/api/products/', async () => {
      return HttpResponse.json({ message: 'Product added', id: 'new-product' }, { status: 201 })
  }),

  http.put('/api/products/:id', async () => {
      return HttpResponse.json({ message: 'Product updated' })
  }),

  http.delete('/api/products/:id', async () => {
      return HttpResponse.json({ message: 'Product removed' })
  }),

  http.get('/api/upload/presign', () => {
      return HttpResponse.json({ url: 'http://minio:9000/presigned-url' })
  }),

  http.get('/api/products/search', ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toLowerCase() || ''
    const filtered = mockProducts.filter(p =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    )
    return HttpResponse.json(filtered)
  }),

]

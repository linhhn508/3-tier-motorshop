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

  http.get('/api/feedback/:productId', ({ params }) => {
    if (params.productId === mockProductDetail.id) {
      return HttpResponse.json(mockFeedbackList)
    }
    return HttpResponse.json([])
  }),

  http.post('/api/contact/', () => {
    return HttpResponse.json({ message: 'ok' })
  }),

  http.post('/api/feedback/', () => {
    return HttpResponse.json({ message: 'ok' })
  }),
]

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../../tests/setup'
import ProductInfoPage from '../ProductInfoPage'
import { mockProductDetail } from '../../../tests/mocks/data'

function renderProductInfoPage(productId = 'lop-michelin-city-grip-2') {
  return render(
    <MemoryRouter initialEntries={['/product/' + productId]}>
      <Routes>
        <Route path="/product/:productId" element={<ProductInfoPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProductInfoPage', () => {
  it('shows loading state initially', () => {
    renderProductInfoPage()
    expect(screen.getByText('Đang tải...')).toBeInTheDocument()
  })

  it('renders breadcrumb with link to home', async () => {
    renderProductInfoPage()
    const matches = await screen.findAllByText(mockProductDetail.name)
    expect(matches.length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Trang chủ/i })).toHaveAttribute('href', '/')
  })

  it('renders buy button with price', async () => {
    renderProductInfoPage()
    const button = await screen.findByRole('button', { name: /MUA NGAY/i })
    expect(button).toBeInTheDocument()
  })

  it('shows 404 error for non-existent product', async () => {
    renderProductInfoPage('non-existent-product')
    expect(await screen.findByText(/Sản phẩm không tồn tại/)).toBeInTheDocument()
    expect(screen.getByText(/404/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /quay về trang chủ/i })).toHaveAttribute('href', '/')
  })

  it('shows error message for network failure', async () => {
    server.use(http.get('/api/products/:id/info', () => HttpResponse.error()))
    renderProductInfoPage()
    expect(await screen.findByText(/Đã xảy ra lỗi/)).toBeInTheDocument()
  })

  it('renders product image', async () => {
    renderProductInfoPage()
    const matches = await screen.findAllByText(mockProductDetail.name)
    expect(matches.length).toBeGreaterThan(0)
    const img = screen.getByAltText(mockProductDetail.name)
    expect(img).toHaveAttribute('src', '/images/' + mockProductDetail.id + '/thumbnail.png')
  })

  it('shows Mô tả tab by default', async () => {
    renderProductInfoPage()
    await screen.findAllByText(mockProductDetail.name)
    const descTab = screen.getByRole('button', { name: /Mô tả/ })
    expect(descTab).toHaveClass('active')
  })

  it('switches to Đánh giá tab and shows feedback form', async () => {
    const user = userEvent.setup()
    renderProductInfoPage()
    await screen.findAllByText(mockProductDetail.name)

    const feedbackTab = screen.getByRole('button', { name: /Đánh giá/ })
    await user.click(feedbackTab)

    expect(feedbackTab).toHaveClass('active')
    expect(screen.getByLabelText(/Họ và tên/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gửi phản hồi/ })).toBeInTheDocument()
  })

  it('shows feedback list section below tabs', async () => {
    renderProductInfoPage()
    await screen.findAllByText(mockProductDetail.name)
    expect(await screen.findByText('Trần Minh Khoa')).toBeInTheDocument()
    expect(screen.getByText('Chất lượng tuyệt vời!')).toBeInTheDocument()
  })
})

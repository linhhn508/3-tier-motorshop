import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../../tests/setup'
import HomePage from '../HomePage'
import { mockProducts } from '../../../tests/mocks/data'

function renderHomePage(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <HomePage />
    </MemoryRouter>
  )
}

describe('HomePage', () => {
  it('fetches and renders products', async () => {
    renderHomePage()
    expect(await screen.findByText(mockProducts[0].name)).toBeInTheDocument()
    expect(screen.getByText(mockProducts[9].name)).toBeInTheDocument()
  })

  it('does not show 11th product on first page', async () => {
    renderHomePage()
    await screen.findByText(mockProducts[0].name)
    expect(screen.queryByText(mockProducts[10].name)).not.toBeInTheDocument()
  })

  it('renders product links pointing to /product/:id', async () => {
    renderHomePage()
    const firstProduct = await screen.findByText(mockProducts[0].name)
    const link = firstProduct.closest('a')
    expect(link).toHaveAttribute('href', '/product/' + mockProducts[0].id)
  })

  it('shows second page products when clicking page 2', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await screen.findByText(mockProducts[0].name)
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByText(mockProducts[10].name)).toBeInTheDocument()
    expect(screen.queryByText(mockProducts[0].name)).not.toBeInTheDocument()
  })

  it('renders heading', () => {
    renderHomePage()
    expect(screen.getByText('SẢN PHẨM MỚI NHẤT')).toBeInTheDocument()
  })

  it('handles API failure without crashing', async () => {
    server.use(http.get('/api/products/', () => new HttpResponse(null, { status: 500 })))
    renderHomePage()
    expect(screen.getByText('SẢN PHẨM MỚI NHẤT')).toBeInTheDocument()
  })

  it('handles empty product list', async () => {
    server.use(http.get('/api/products/', () => HttpResponse.json([])))
    renderHomePage()
    expect(screen.getByText('SẢN PHẨM MỚI NHẤT')).toBeInTheDocument()
  })

  it('filters products by search query', async () => {
    renderHomePage('/?q=Michelin')
    expect(await screen.findByText('Lop Michelin City Grip 2')).toBeInTheDocument()
    expect(screen.queryByText('Po Akrapovic R1')).not.toBeInTheDocument()
    expect(screen.getByText(/Kết quả tìm kiếm: "Michelin"/)).toBeInTheDocument()
  })

  it('filters products by category', async () => {
    renderHomePage('/?category=Lop+xe')
    expect(await screen.findByText('Lop Michelin City Grip 2')).toBeInTheDocument()
    expect(screen.getByText('Lop Pirelli Diablo Rosso')).toBeInTheDocument()
    expect(screen.queryByText('Po Akrapovic R1')).not.toBeInTheDocument()
  })

  it('shows no-results message for empty search', async () => {
    renderHomePage('/?q=xyznotfound')
    expect(await screen.findByText(/Không tìm thấy sản phẩm phù hợp/)).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../../tests/setup'
import CategoryMenu from '../CategoryMenu'
import { mockCategories } from '../../../tests/mocks/data'

function renderCategoryMenu() {
  return render(<MemoryRouter><CategoryMenu /></MemoryRouter>)
}

describe('CategoryMenu', () => {
  it('renders category title', () => {
    renderCategoryMenu()
    expect(screen.getByText('Danh mục sản phẩm')).toBeInTheDocument()
  })

  it('renders "Tất cả" link', () => {
    renderCategoryMenu()
    expect(screen.getByRole('link', { name: 'Tất cả' })).toBeInTheDocument()
  })

  it('fetches and displays categories', async () => {
    renderCategoryMenu()
    for (const cat of mockCategories) {
      expect(await screen.findByText(cat)).toBeInTheDocument()
    }
  })

  it('category links point to /?category=...', async () => {
    renderCategoryMenu()
    const firstCat = await screen.findByText(mockCategories[0])
    const link = firstCat.closest('a')
    expect(link).toHaveAttribute('href', `/?category=${encodeURIComponent(mockCategories[0])}`)
  })

  it('handles API error without crashing', async () => {
    server.use(
      http.get('/api/products/categories/', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    renderCategoryMenu()
    expect(screen.getByText('Danh mục sản phẩm')).toBeInTheDocument()
  })
})

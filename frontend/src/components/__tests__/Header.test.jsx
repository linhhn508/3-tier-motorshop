import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Header from '../Header'

function renderHeader() {
  return render(<MemoryRouter><Header /></MemoryRouter>)
}

describe('Header', () => {
  it('renders logo image', () => {
    renderHeader()
    expect(screen.getByAltText('My Motor Shop')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: /homepage/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /blog/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument()
  })

  it('renders search input', () => {
    renderHeader()
    expect(screen.getByPlaceholderText('Tìm kiếm sản phẩm...')).toBeInTheDocument()
  })

  it('renders banner info', () => {
    renderHeader()
    expect(screen.getByText(/GIAO HÀNG TOÀN QUỐC/)).toBeInTheDocument()
  })

  it('has a search form with role="search"', () => {
    renderHeader()
    expect(screen.getByRole('search')).toBeInTheDocument()
  })

  it('allows typing in the search input', async () => {
    const user = userEvent.setup()
    renderHeader()
    const input = screen.getByPlaceholderText('Tìm kiếm sản phẩm...')
    await user.type(input, 'Michelin')
    expect(input).toHaveValue('Michelin')
  })
})

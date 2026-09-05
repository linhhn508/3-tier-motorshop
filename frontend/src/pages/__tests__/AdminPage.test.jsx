import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminPage from '../AdminPage'

beforeEach(() => {
  localStorage.setItem('admin_token', 'mock-jwt-token')
})
afterEach(() => {
  localStorage.removeItem('admin_token')
})

function renderAdminPage() {
  return render(<MemoryRouter><AdminPage /></MemoryRouter>)
}

describe('AdminPage', () => {
  it('renders admin dashboard with tabs', () => {
    renderAdminPage()
    expect(screen.getByText(/products/i)).toBeInTheDocument()
    expect(screen.getByText(/contacts/i)).toBeInTheDocument()
    expect(screen.getByText(/feedback/i)).toBeInTheDocument()
  })

  it('shows product list by default', async () => {
    renderAdminPage()
    expect(await screen.findByText('Lop Michelin City Grip 2')).toBeInTheDocument()
  })

  it('switches to contacts tab', async () => {
    const user = userEvent.setup()
    renderAdminPage()
    await user.click(screen.getByRole('button', { name: /contacts/i }))
    expect(await screen.findByText('test@test.com')).toBeInTheDocument()
  })
})

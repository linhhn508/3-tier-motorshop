import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminLoginPage from '../AdminLoginPage'

function renderLoginPage() {
  return render(<MemoryRouter><AdminLoginPage /></MemoryRouter>)
}

describe('AdminLoginPage', () => {
  it('renders login form', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('shows error on invalid credentials', async () => {
    const user = userEvent.setup()
    renderLoginPage()
    await user.type(screen.getByLabelText(/username/i), 'wrong')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /login/i }))
    expect(await screen.findByText(/invalid/i)).toBeInTheDocument()
  })
})

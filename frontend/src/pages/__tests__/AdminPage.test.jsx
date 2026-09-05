import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminPage from '../AdminPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderAdmin(initialEntries = ['/admin']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AdminPage />
    </MemoryRouter>
  )
}

describe('AdminPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  it('redirects to login when no token', () => {
    renderAdmin()
    expect(mockNavigate).toHaveBeenCalledWith('/admin/login')
  })

  it('renders sidebar and products tab by default', async () => {
    localStorage.setItem('admin_token', 'mock-jwt-token')
    renderAdmin()
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    expect(screen.getByText('Sản phẩm')).toBeInTheDocument()
    expect(screen.getByText('Liên hệ')).toBeInTheDocument()
    expect(screen.getByText('Phản hồi')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Quản lý sản phẩm')).toBeInTheDocument()
    })
  })

  it('shows product list in products tab', async () => {
    localStorage.setItem('admin_token', 'mock-jwt-token')
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByText('Lop Michelin City Grip 2')).toBeInTheDocument()
    })
  })

  it('switches to contacts tab', async () => {
    localStorage.setItem('admin_token', 'mock-jwt-token')
    renderAdmin()
    const user = userEvent.setup()
    const contactsBtn = screen.getByText('Liên hệ')
    await user.click(contactsBtn)
    await waitFor(() => {
      expect(screen.getByText('Liên hệ từ khách hàng')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('test@test.com')).toBeInTheDocument()
    })
  })

  it('switches to feedback tab', async () => {
    localStorage.setItem('admin_token', 'mock-jwt-token')
    renderAdmin()
    const user = userEvent.setup()
    const feedbackBtn = screen.getByText('Phản hồi')
    await user.click(feedbackBtn)
    await waitFor(() => {
      expect(screen.getByText('Phản hồi từ khách hàng')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('Tran Minh Khoa')).toBeInTheDocument()
    })
  })

  it('opens add product form', async () => {
    localStorage.setItem('admin_token', 'mock-jwt-token')
    renderAdmin()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByText('+ Thêm sản phẩm')).toBeInTheDocument()
    })
    await user.click(screen.getByText('+ Thêm sản phẩm'))
    expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument()
    expect(screen.getByLabelText(/ID \(slug\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tên sản phẩm/)).toBeInTheDocument()
  })

  it('submits new product', async () => {
    localStorage.setItem('admin_token', 'mock-jwt-token')
    renderAdmin()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByText('+ Thêm sản phẩm')).toBeInTheDocument()
    })
    await user.click(screen.getByText('+ Thêm sản phẩm'))
    await user.type(screen.getByLabelText(/ID \(slug\)/), 'new-product')
    await user.type(screen.getByLabelText(/Tên sản phẩm/), 'New Product')
    await user.type(screen.getByLabelText(/Giá/), '100000')
    await user.type(screen.getByLabelText(/Danh mục/), 'Phu kien')
    const submitBtns = screen.getAllByRole('button', { name: /^Thêm$/ })
    await user.click(submitBtns[submitBtns.length - 1])
    await waitFor(() => {
      expect(screen.getByText('Thêm sản phẩm thành công.')).toBeInTheDocument()
    })
  })

  it('deletes a product with confirmation', async () => {
    localStorage.setItem('admin_token', 'mock-jwt-token')
    window.confirm = vi.fn(() => true)
    renderAdmin()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getAllByText('Xóa').length).toBeGreaterThan(0)
    })
    await user.click(screen.getAllByText('Xóa')[0])
    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText('Đã xóa sản phẩm.')).toBeInTheDocument()
    })
  })

  it('handles logout', async () => {
    localStorage.setItem('admin_token', 'mock-jwt-token')
    renderAdmin()
    const user = userEvent.setup()
    await user.click(screen.getByText('Đăng xuất'))
    expect(localStorage.getItem('admin_token')).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith('/admin/login')
  })
})
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/admin.css'

function useAuthFetch() {
  const navigate = useNavigate()
  const token = localStorage.getItem('admin_token')

  const authFetch = useCallback(async (url, options = {}) => {
    if (!token) {
      navigate('/admin/login')
      return null
    }
    const resp = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    })
    if (resp.status === 401) {
      localStorage.removeItem('admin_token')
      navigate('/admin/login')
      return null
    }
    return resp
  }, [token, navigate])

  return { authFetch, token }
}

function ProductsTab({ authFetch }) {
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ id: '', name: '', price: '', category: '', brand: '', made_in: '', material: '', color: '', detail: '' })
  const [imageFile, setImageFile] = useState(null)
  const [status, setStatus] = useState(null)

  const fetchProducts = useCallback(async () => {
    const resp = await fetch('/api/products/')
    if (resp.ok) setProducts(await resp.json())
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const resetForm = () => {
    setFormData({ id: '', name: '', price: '', category: '', brand: '', made_in: '', material: '', color: '', detail: '' })
    setImageFile(null)
    setEditingId(null)
    setShowForm(false)
    setStatus(null)
  }

  const handleEdit = async (productId) => {
    const resp = await fetch(`/api/products/${productId}/info`)
    if (resp.ok) {
      const data = await resp.json()
      setFormData({
        id: data.id,
        name: data.name,
        price: data.price,
        category: data.category,
        brand: data.product?.overall?.brand || '',
        made_in: data.product?.overall?.made_in || '',
        material: data.product?.overall?.material || '',
        color: data.product?.overall?.color || '',
        detail: data.product?.detail || '',
      })
      setEditingId(productId)
      setShowForm(true)
    }
  }

  const handleDelete = async (productId) => {
    if (!window.confirm(`Xóa sản phẩm "${productId}"?`)) return
    const resp = await authFetch(`/api/products/${productId}`, { method: 'DELETE' })
    if (resp?.ok) {
      setStatus({ type: 'success', message: 'Đã xóa sản phẩm.' })
      fetchProducts()
    } else {
      setStatus({ type: 'error', message: 'Xóa thất bại.' })
    }
  }

  const uploadImage = async (productId) => {
    if (!imageFile) return
    const resp = await authFetch(`/api/upload/presign?filename=${productId}/thumbnail.png`)
    if (!resp?.ok) return
    const { url } = await resp.json()
    await fetch(url, { method: 'PUT', body: imageFile, headers: { 'Content-Type': imageFile.type } })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    const payload = { ...formData, price: parseInt(formData.price, 10) }

    if (editingId) {
      const { id, ...updateData } = payload
      const resp = await authFetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (resp?.ok) {
        if (imageFile) await uploadImage(editingId)
        fetchProducts()
        resetForm()
        setStatus({ type: 'success', message: 'Cập nhật thành công.' })
      } else {
        setStatus({ type: 'error', message: 'Cập nhật thất bại.' })
      }
    } else {
      const resp = await authFetch('/api/products/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (resp?.ok) {
        if (imageFile) await uploadImage(formData.id)
        fetchProducts()
        resetForm()
        setStatus({ type: 'success', message: 'Thêm sản phẩm thành công.' })
      } else {
        const err = await resp?.json().catch(() => ({}))
        setStatus({ type: 'error', message: err.error || 'Thêm thất bại.' })
      }
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-header">
        <h2>Quản lý sản phẩm</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? 'Đóng' : '+ Thêm sản phẩm'}
        </button>
      </div>

      {status && <div className={`form-status ${status.type}`} role="alert">{status.message}</div>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <h3>{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
          <div className="admin-form-grid">
            <div className="form-group">
              <label htmlFor="prod-id">ID (slug) *</label>
              <input type="text" id="prod-id" name="id" value={formData.id} onChange={handleChange} disabled={!!editingId} required />
            </div>
            <div className="form-group">
              <label htmlFor="prod-name">Tên sản phẩm *</label>
              <input type="text" id="prod-name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="prod-price">Giá (VNĐ) *</label>
              <input type="number" id="prod-price" name="price" value={formData.price} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="prod-category">Danh mục *</label>
              <input type="text" id="prod-category" name="category" value={formData.category} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="prod-brand">Hãng</label>
              <input type="text" id="prod-brand" name="brand" value={formData.brand} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="prod-origin">Xuất xứ</label>
              <input type="text" id="prod-origin" name="made_in" value={formData.made_in} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="prod-material">Chất liệu</label>
              <input type="text" id="prod-material" name="material" value={formData.material} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="prod-color">Màu sắc</label>
              <input type="text" id="prod-color" name="color" value={formData.color} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="prod-detail">Mô tả chi tiết</label>
            <textarea id="prod-detail" name="detail" rows="3" value={formData.detail} onChange={handleChange}></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="prod-image">Ảnh sản phẩm</label>
            <input type="file" id="prod-image" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn-primary">{editingId ? 'Cập nhật' : 'Thêm'}</button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={resetForm}>Hủy</button>
          </div>
        </form>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên sản phẩm</th>
              <th>Giá</th>
              <th>Danh mục</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-muted-foreground)' }}>Chưa có sản phẩm nào.</td></tr>
            ) : products.map((p) => (
              <tr key={p.id}>
                <td className="admin-cell-id">{p.id}</td>
                <td>{p.name}</td>
                <td>{p.price} VNĐ</td>
                <td>{p.category}</td>
                <td className="admin-cell-actions">
                  <button className="admin-btn admin-btn-sm admin-btn-edit" onClick={() => handleEdit(p.id)}>Sửa</button>
                  <button className="admin-btn admin-btn-sm admin-btn-delete" onClick={() => handleDelete(p.id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ContactsTab({ authFetch }) {
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    authFetch('/api/contacts/').then(async (resp) => {
      if (resp?.ok) setContacts(await resp.json())
    })
  }, [authFetch])

  return (
    <div className="admin-tab-content">
      <h2>Liên hệ từ khách hàng</h2>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Chủ đề</th>
              <th>Nội dung</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-muted-foreground)' }}>Chưa có liên hệ nào.</td></tr>
            ) : contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.subject || '—'}</td>
                <td className="admin-cell-message">{c.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FeedbackTab({ authFetch }) {
  const [feedback, setFeedback] = useState([])

  useEffect(() => {
    authFetch('/api/feedback/').then(async (resp) => {
      if (resp?.ok) setFeedback(await resp.json())
    })
  }, [authFetch])

  const renderStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <div className="admin-tab-content">
      <h2>Phản hồi từ khách hàng</h2>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Đánh giá</th>
              <th>Nội dung</th>
              <th>Sản phẩm</th>
            </tr>
          </thead>
          <tbody>
            {feedback.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--color-muted-foreground)' }}>Chưa có phản hồi nào.</td></tr>
            ) : feedback.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td className="admin-cell-stars">{renderStars(f.rating)}</td>
                <td className="admin-cell-message">{f.comment}</td>
                <td className="admin-cell-id">{f.product_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminPage() {
  const { authFetch, token } = useAuthFetch()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('products')

  useEffect(() => {
    if (!token) navigate('/admin/login')
  }, [token, navigate])

  if (!token) return null

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  const tabs = [
    { key: 'products', label: 'Sản phẩm', icon: '📦' },
    { key: 'contacts', label: 'Liên hệ', icon: '✉️' },
    { key: 'feedback', label: 'Phản hồi', icon: '⭐' },
  ]

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h3>Admin Panel</h3>
        </div>
        <nav className="admin-sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`admin-sidebar-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="admin-sidebar-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <button className="admin-sidebar-btn admin-logout-btn" onClick={handleLogout}>
          Đăng xuất
        </button>
      </aside>
      <main className="admin-main">
        {activeTab === 'products' && <ProductsTab authFetch={authFetch} />}
        {activeTab === 'contacts' && <ContactsTab authFetch={authFetch} />}
        {activeTab === 'feedback' && <FeedbackTab authFetch={authFetch} />}
      </main>
    </div>
  )
}

export default AdminPage
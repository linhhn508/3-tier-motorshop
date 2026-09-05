import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      navigate(`/?q=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/')
    }
  }

  return (
    <header id="header">
      <form id="search-container" onSubmit={handleSearch} role="search">
        <Link to="/">
          <img src="/assets/prototype.png" alt="My Motor Shop" />
        </Link>
        <label htmlFor="header-search" className="visually-hidden">Tìm kiếm sản phẩm</label>
        <input
          type="text"
          id="header-search"
          placeholder="Tìm kiếm sản phẩm..."
          name="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" aria-label="Tìm kiếm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </button>
      </form>
      <div id="nav-container">
        <nav aria-label="Main navigation">
          <NavLink to="/" end>Homepage</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/feedback">Feedback</NavLink>
        </nav>
      </div>
      <div id="header-banner">
        <img src="/assets/capture.png" alt="" />
        <div className="banner-features" role="list">
          <p role="listitem">GIAO HÀNG TOÀN QUỐC<br />Shipcode theo yêu cầu</p>
          <p role="listitem">ĐIỆN THOẠI<br />036 591 3732</p>
          <p role="listitem">CHAT VỚI CHÚNG TÔI<br />036 591 3732</p>
          <p role="listitem">MUA BÁN, KÝ GỬI<br />Xe và các sản phẩm liên quan</p>
        </div>
      </div>
    </header>
  )
}

export default Header

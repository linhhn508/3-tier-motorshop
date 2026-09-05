import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

function CategoryMenu() {
  const [categories, setCategories] = useState([])
  const [searchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || ''

  useEffect(() => {
    fetch('/api/products/categories/')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setCategories)
      .catch((err) => console.error('Error loading categories:', err))
  }, [])

  return (
    <div id="menu" className="menu">
      <ul>
        <li className="menu-title">Danh mục sản phẩm</li>
        <li>
          <Link to="/" className={!activeCategory ? 'active' : ''}>Tất cả</Link>
        </li>
        {categories.map((cat) => (
          <li key={cat}>
            <Link
              to={`/?category=${encodeURIComponent(cat)}`}
              className={activeCategory === cat ? 'active' : ''}
            >
              {cat}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CategoryMenu

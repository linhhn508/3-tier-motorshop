import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CategoryMenu from '../components/CategoryMenu'
import Pagination from '../components/Pagination'

const ITEMS_PER_PAGE = 10

function HomePage() {
  const [products, setProducts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchParams] = useSearchParams()

  const searchQuery = searchParams.get('q') || ''
  const categoryFilter = searchParams.get('category') || ''

  useEffect(() => {
    fetch('/api/products/')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setProducts)
      .catch((err) => console.error('Error loading products:', err))
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter])

  const filteredProducts = useMemo(() => {
    let result = products
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter)
    }
    return result
  }, [products, searchQuery, categoryFilter])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const heading = searchQuery
    ? `Kết quả tìm kiếm: "${searchQuery}"`
    : categoryFilter
      ? categoryFilter
      : 'SẢN PHẨM MỚI NHẤT'

  return (
    <div className="container">
      <CategoryMenu />
      <div className="content">
        <h3>{heading}</h3>
        {filteredProducts.length === 0 && (searchQuery || categoryFilter) && (
          <p className="no-results">Không tìm thấy sản phẩm phù hợp.</p>
        )}
        <div id="product_list" className="product-grid">
          {paginatedProducts.map((product) => (
            <div key={product.id} className="product-item">
              <Link to={`/product/${product.id}`}>
                <img
                  src={`/images/${product.id}/thumbnail.png`}
                  alt={product.name}
                  loading="lazy"
                />
                <h4>{product.name}</h4>
              </Link>
              <p>{product.price} VNĐ</p>
            </div>
          ))}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}

export default HomePage

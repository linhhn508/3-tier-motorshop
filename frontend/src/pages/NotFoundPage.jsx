import { Link } from 'react-router-dom'
import '../styles/pages.css'

function NotFoundPage() {
  return (
    <div className="page-container not-found-page">
      <h1 className="not-found-code">404</h1>
      <h2 className="not-found-title">Trang không tồn tại</h2>
      <p className="not-found-message">
        Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
      </p>
      <Link to="/" className="not-found-link">Quay về trang chủ</Link>
    </div>
  )
}

export default NotFoundPage

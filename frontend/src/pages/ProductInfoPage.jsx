import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import CategoryMenu from '../components/CategoryMenu'
import '../styles/product_info.css'
import '../styles/pages.css'

const ratingLabels = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc']

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="star-rating" role="radiogroup" aria-label="Mức độ hài lòng">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} sao`}
          tabIndex={0}
          className={`star ${star <= (hovered || value) ? 'active' : ''}`}
          onMouseOver={() => setHovered(star)}
          onMouseOut={() => setHovered(0)}
          onClick={() => onChange(star)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(star) } }}
        >
          &#9733;
        </span>
      ))}
    </div>
  )
}

function renderStars(count) {
  return '★'.repeat(count) + '☆'.repeat(5 - count)
}

function FeedbackForm({ productId, onSubmitted }) {
  const [formData, setFormData] = useState({
    name: '',
    rating: 0,
    comment: '',
  })
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus(null)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, product_id: productId }),
      })
      if (response.ok) {
        setStatus({ type: 'success', message: 'Gửi phản hồi thành công! Cảm ơn bạn đã đóng góp.' })
        setFormData({ name: '', rating: 0, comment: '' })
        onSubmitted()
      } else {
        setStatus({ type: 'error', message: 'Gửi phản hồi thất bại. Vui lòng thử lại.' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' })
      console.error('Error submitting feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="feedback-form-wrapper">
      <form className="feedback-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="fb-name">Họ và tên <span className="required">*</span></label>
          <input type="text" id="fb-name" name="name" placeholder="Nguyễn Văn A" required value={formData.name} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Mức độ hài lòng <span className="required">*</span></label>
          <StarRating value={formData.rating} onChange={(val) => setFormData({ ...formData, rating: val })} />
          <span className="rating-label">{ratingLabels[formData.rating] || 'Chưa đánh giá'}</span>
        </div>

        <div className="form-group">
          <label htmlFor="fb-comment">Nội dung phản hồi <span className="required">*</span></label>
          <textarea id="fb-comment" name="comment" rows="4" placeholder="Chia sẻ trải nghiệm của bạn..." required value={formData.comment} onChange={handleChange}></textarea>
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
        </button>
        {status && (
          <div className={`form-status ${status.type}`} role="alert">
            {status.message}
          </div>
        )}
      </form>
    </div>
  )
}

function ReviewList({ reviews }) {
  return (
    <div className="feedback-list-section">
      <h3>Đánh giá từ khách hàng ({reviews.length})</h3>
      {reviews.length === 0 ? (
        <p className="no-reviews">Chưa có đánh giá nào cho sản phẩm này.</p>
      ) : (
        <div className="review-list">
          {reviews.map((review, index) => (
            <div key={index} className="review-item">
              <div className="review-header">
                <strong>{review.name}</strong>
                <span className="review-stars">{renderStars(review.rating)}</span>
              </div>
              <p>{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductInfoPage() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('description')
  const [reviews, setReviews] = useState([])

  const fetchReviews = useCallback(() => {
    fetch(`/api/feedback/${productId}`)
      .then((res) => res.ok ? res.json() : [])
      .then(setReviews)
      .catch(() => setReviews([]))
  }, [productId])

  useEffect(() => {
    fetch(`/api/products/${productId}/info`)
      .then((res) => {
        if (res.status === 404) {
          setError('Sản phẩm không tồn tại.')
          return null
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (data) setProduct(data)
      })
      .catch((err) => {
        setError('Đã xảy ra lỗi khi tải sản phẩm. Vui lòng thử lại sau.')
        console.error('Error loading product:', err)
      })

    fetchReviews()
  }, [productId, fetchReviews])

  if (error) {
    return (
      <div className="product_info_container">
        <CategoryMenu />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>404 - Không tìm thấy sản phẩm</h2>
          <p>{error}</p>
          <Link to="/">Quay về trang chủ</Link>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="product_info_container">
        <CategoryMenu />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p>Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="product_info_container">
      <CategoryMenu />
      <div className="product_info_header">
        <h3><Link to="/">Trang chủ</Link> &raquo; {product.name}</h3>
      </div>
      <div className="product_info_content">
        <div className="overall-info-wrapper">
          <div className="image-container">
            <img src={`/images/${product.id}/thumbnail.png`} alt={product.name} loading="lazy" />
          </div>
          <div className="overall-info">
            <div>
              <h3>{product.name}</h3>
              <p>
                <strong>Giá:</strong> {product.price} VNĐ<br />
                <strong>Tình trạng:</strong> Còn hàng<br />
                <strong>Hãng sản xuất:</strong> {product.product?.overall?.brand}<br />
                <strong>Xuất xứ:</strong> {product.product?.overall?.made_in}<br />
                <strong>Chất liệu:</strong> {product.product?.overall?.material}<br />
                <strong>Màu sắc:</strong> {product.product?.overall?.color}<br />
              </p>
              <button className="add-to-cart-btn">
                MUA NGAY VỚI GIÁ {product.price} VNĐ<br />Đặt mua giao hàng tận nơi
              </button>
            </div>
            <ol className="slogan">
              <li><img src="/assets/payment.png" alt="Thanh toán đa dạng" /> PHƯƠNG THỨC THANH TOÁN ĐA DẠNG</li>
              <li><img src="/assets/delivery.png" alt="Ship COD" /> SHIP COD TOÀN QUỐC. PHÍ TÙY TỈNH</li>
              <li><img src="/assets/policy.png" alt="Bảo hành" /> CHÍNH SÁCH BẢO HÀNH VÀ ĐỔI TRẢ</li>
              <li><img src="/assets/badge.png" alt="Chất lượng" /> CHẤT LƯỢNG ĐẢM BẢO</li>
            </ol>
          </div>
        </div>

        <div className="product-tabs">
          <button
            className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Mô tả
          </button>
          <button
            className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            Đánh giá
          </button>
        </div>

        {activeTab === 'description' ? (
          <div className="detailed_info_wrapper">
            <div dangerouslySetInnerHTML={{ __html: product.product?.detail }} />
          </div>
        ) : (
          <FeedbackForm productId={product.id} onSubmitted={fetchReviews} />
        )}
      </div>
      <ReviewList reviews={reviews} />
      <div className="product_info_related">
        <h3>SẢN PHẨM LIÊN QUAN</h3>
      </div>
    </div>
  )
}

export default ProductInfoPage

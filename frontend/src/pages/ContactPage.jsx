import { useState } from 'react'
import '../styles/pages.css'

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: '',
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
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setStatus({ type: 'success', message: 'Gửi tin nhắn thành công! Chúng tôi sẽ phản hồi sớm nhất.' })
        setFormData({ name: '', phone: '', email: '', subject: '', message: '' })
      } else {
        setStatus({ type: 'error', message: 'Gửi tin nhắn thất bại. Vui lòng thử lại.' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' })
      console.error('Error submitting contact form:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Liên hệ</h2>
        <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn</p>
      </div>

      <div className="contact-layout">
        <div className="contact-info">
          <h3>Thông tin liên hệ</h3>

          <div className="contact-info-item">
            <div className="contact-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <strong>Địa chỉ</strong>
              <p>345/75 Phan Xích Long, Phường Cầu Kiệu, Phú Nhuận, TP.HCM</p>
            </div>
          </div>

          <div className="contact-info-item">
            <div className="contact-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
            </div>
            <div>
              <strong>Hotline tư vấn</strong>
              <p><a href="tel:0365913732">036 591 3732</a></p>
            </div>
          </div>

          <div className="contact-info-item">
            <div className="contact-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <div>
              <strong>Email</strong>
              <p><a href="mailto:example@example.com">example@example.com</a></p>
            </div>
          </div>

          <div className="contact-info-item">
            <div className="contact-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <strong>Giờ mở cửa</strong>
              <p>Thứ Hai - Thứ Bảy: 9:30 AM - 6:00 PM</p>
              <p>Chủ Nhật: 10:00 AM - 4:00 PM</p>
            </div>
          </div>

          <div className="map-embed">
            <iframe
              title="Vị trí cửa hàng My Motor Shop"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1234567890!2d106.6850!3d10.8000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sPhan+X%C3%ADch+Long%2C+Ph%C3%BA+Nhu%E1%BA%ADn%2C+TP.HCM!5e0!3m2!1svi!2svn!4v1234567890"
              width="100%"
              height="250"
              style={{ border: 0, borderRadius: '6px' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="contact-form-wrapper">
          <h3>Gửi tin nhắn cho chúng tôi</h3>
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="contact-name">Họ và tên <span className="required">*</span></label>
              <input type="text" id="contact-name" name="name" placeholder="Nguyễn Văn A" required value={formData.name} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact-phone">Số điện thoại <span className="required">*</span></label>
                <input type="tel" id="contact-phone" name="phone" placeholder="036 591 3732" required value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="contact-email">Email</label>
                <input type="email" id="contact-email" name="email" placeholder="example@example.com" value={formData.email} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="contact-subject">Chủ đề</label>
              <select id="contact-subject" name="subject" value={formData.subject} onChange={handleChange}>
                <option value="">-- Chọn chủ đề --</option>
                <option value="product">Tư vấn sản phẩm</option>
                <option value="order">Đặt hàng / Giao hàng</option>
                <option value="warranty">Bảo hành / Đổi trả</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contact-message">Nội dung <span className="required">*</span></label>
              <textarea id="contact-message" name="message" rows="5" placeholder="Nhập nội dung cần liên hệ..." required value={formData.message} onChange={handleChange}></textarea>
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
            </button>
            {status && (
              <div className={`form-status ${status.type}`} role="alert">
                {status.message}
              </div>
            )}
            <p className="form-note">Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.</p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ContactPage

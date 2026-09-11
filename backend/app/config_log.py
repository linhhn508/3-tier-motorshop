import logging
import os
import socket
import time

from flask import request


def setup_logging(app, log_level="INFO", log_to_file=False, log_dir='./logs'):
    # 1. Lấy cấu hình từ biến môi trường
    app.logger.setLevel(getattr(logging, log_level))

    # Xóa các handler mặc định của Flask để tránh bị lặp log
    app.logger.handlers.clear()

    # 2. Định nghĩa Format chung cho log
    instance_id = socket.gethostname()
    log_formatter = logging.Formatter(
    f'[{instance_id}] [%(asctime)s] %(levelname)s in %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

    # 3. Handler 1: Đẩy log ra Console stdout (Cần thiết cho Docker Compose)
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(log_formatter)
    app.logger.addHandler(stream_handler)

    # 4. Handler 2: Ghi log ra File (Cần thiết cho AWS EC2 + CloudWatch)
    if log_to_file:
        from logging.handlers import RotatingFileHandler

        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

        file_handler = RotatingFileHandler(
            os.path.join(log_dir, 'flask.log'),
            maxBytes=5*1024*1024,  # 5MB mỗi file
            backupCount=3
        )
        file_handler.setFormatter(log_formatter)
        app.logger.addHandler(file_handler)

    # 5. Đăng ký Middleware ghi log tự động cho mọi Request
    @app.before_request
    def start_timer():
        request.start_time = time.time()

    @app.after_request
    def log_request_info(response):
        # Bỏ qua log request nếu là route kiểm tra sức khỏe hệ thống (Health check của AWS)
        if request.path == '/health' or request.path == '/metrics':
            return response

        duration = (time.time() - request.start_time) * 1000
        app.logger.info(
            f"IP: {request.headers.get('X-Forwarded-For')} | "
            f"{request.method} {request.path} | "
            f"Status: {response.status_code} | Time: {duration:.2f}ms"
        )
        return response

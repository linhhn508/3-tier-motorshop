FROM python:3.12-slim

ENV FLASK_APP=app

WORKDIR /web-service

RUN pip install uv

COPY backend/pyproject.toml ./

RUN uv sync

COPY backend/app ./app

EXPOSE 5000

CMD ["uv", "run", "--", "gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:create_app()"]

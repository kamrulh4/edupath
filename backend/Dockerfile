# syntax=docker/dockerfile:1

FROM python:3.14-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install dependencies first, in their own cached layer, before the
# application code is copied in so code-only changes skip this step.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

COPY . /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev


FROM python:3.14-slim

RUN groupadd -r django && useradd -r -g django -d /app django

WORKDIR /app

COPY --from=builder --chown=django:django /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN chown django:django /app \
    && mkdir -p /staticfiles /media \
    && chown django:django /staticfiles /media \
    && chmod +x /app/docker-entrypoint.sh

USER django

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "app.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--threads", "2", \
     "--worker-tmp-dir", "/dev/shm", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]

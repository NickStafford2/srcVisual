FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /frontend
COPY srcVisual/frontend/package.json srcVisual/frontend/package-lock.json ./
RUN npm ci
COPY srcVisual/frontend/ ./
RUN npm run build


FROM ubuntu:24.04 AS native-builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --no-install-recommends -y \
    ca-certificates \
    clang \
    cmake \
    curl \
    default-jdk-headless \
    g++ \
    git \
    libarchive-dev \
    libboost-all-dev \
    libcurl4-openssl-dev \
    libxml2-dev \
    libxml2-utils \
    libxslt1-dev \
    make \
    ninja-build \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY . /workspace

RUN ./build_srcML.sh --yes /workspace
RUN ./build_srcDiff.sh --yes /workspace
RUN ./build_srcReader.sh --yes --release /workspace
RUN ./build_srcMove.sh --yes --release /workspace


FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:/opt/srcML-install/bin:/opt/srcDiff/bin:/opt/srcMove/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/srcML-install/lib:/opt/srcDiff/bin:/opt/srcReader/bin"
ENV SRCVISUAL_FRONTEND_DIST="/app/frontend/dist"
ENV PORT=5000

RUN apt-get update && apt-get install --no-install-recommends -y \
    ca-certificates \
    curl \
    libarchive-dev \
    libboost-all-dev \
    libcurl4-openssl-dev \
    libxml2-dev \
    libxslt1-dev \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv

WORKDIR /app

COPY srcVisual/pyproject.toml srcVisual/poetry.lock ./
COPY srcVisual/srcvisual /app/srcvisual
COPY srcVisual/gunicorn.conf.py /app/gunicorn.conf.py
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

RUN /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install .

COPY --from=native-builder /workspace/srcML-install /opt/srcML-install
COPY --from=native-builder /workspace/srcDiff/build/bin /opt/srcDiff/bin
COPY --from=native-builder /workspace/srcReader/build/bin /opt/srcReader/bin
RUN mkdir -p /opt/srcMove/bin
COPY --from=native-builder /workspace/srcMove/build/srcMove /opt/srcMove/bin/srcMove

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail http://127.0.0.1:5000/api/health || exit 1

CMD ["gunicorn", "--config", "gunicorn.conf.py", "srcvisual.wsgi:app"]

FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /frontend
COPY srcVisual/frontend/package.json srcVisual/frontend/package-lock.json ./
RUN npm ci
COPY srcVisual/frontend/ ./
RUN npm run build


FROM frontend-builder AS frontend-test

RUN npm test


FROM ubuntu:24.04 AS native-builder

ARG UBUNTU_CODENAME=noble
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

# Ubuntu 24.04 ships CMake 3.28, but current srcML presets use schema version
# 10. Use Kitware's Ubuntu repository, matching the workspace development image.
RUN apt-get update && apt-get install --no-install-recommends -y gpg \
    && curl -fsSL https://apt.kitware.com/keys/kitware-archive-latest.asc \
      | gpg --dearmor \
      > /usr/share/keyrings/kitware-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/kitware-archive-keyring.gpg] https://apt.kitware.com/ubuntu/ ${UBUNTU_CODENAME} main" \
      > /etc/apt/sources.list.d/kitware.list \
    && apt-get update \
    && apt-get install --no-install-recommends -y kitware-archive-keyring cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY build_srcML.sh build_srcDiff.sh build_srcReader.sh build_srcMove.sh utils.sh ./

# Keep the native projects in separate cache layers. A srcVisual-only edit must
# not force Docker to rebuild the complete srcML toolchain.
COPY srcML ./srcML
RUN ./build_srcML.sh --yes /workspace

COPY srcReader ./srcReader
RUN ./build_srcReader.sh --yes --release /workspace

COPY srcDiff ./srcDiff
RUN ./build_srcDiff.sh --yes /workspace

COPY srcMove ./srcMove
RUN ./build_srcMove.sh --yes --release /workspace


FROM ubuntu:24.04 AS python-builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --no-install-recommends -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv

WORKDIR /app

COPY srcVisual/pyproject.toml srcVisual/poetry.lock ./
COPY srcVisual/srcvisual /app/srcvisual

RUN /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install .


FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:/opt/srcML-install/bin:/opt/srcDiff/bin:/opt/srcMove/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/srcML-install/lib:/opt/srcDiff/bin:/opt/srcReader/bin"
ENV SRCVISUAL_FRONTEND_DIST="/app/frontend/dist"
ENV SRCVISUAL_EXAMPLES_DIR="/app/examples"
ENV PORT=5000

RUN apt-get update && apt-get install --no-install-recommends -y \
    ca-certificates \
    libarchive13t64 \
    libcurl4t64 \
    libxml2 \
    libxslt1.1 \
    git \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY srcVisual/gunicorn.conf.py /app/gunicorn.conf.py
COPY srcVisual/examples /app/examples
COPY --from=frontend-builder /frontend/dist /app/frontend/dist
COPY --from=python-builder /opt/venv /opt/venv

COPY --from=native-builder /workspace/srcML-install /opt/srcML-install
COPY --from=native-builder /workspace/srcDiff/build/bin /opt/srcDiff/bin
COPY --from=native-builder /workspace/srcReader/build/bin /opt/srcReader/bin
RUN mkdir -p /opt/srcMove/bin
COPY --from=native-builder /workspace/srcMove/build/srcMove /opt/srcMove/bin/srcMove
COPY --from=native-builder /workspace/srcMove/bin/srcmove-history /opt/srcMove/bin/srcmove-history
COPY --from=native-builder /workspace/srcMove/srcmove_history /opt/srcMove/srcmove_history
COPY --from=native-builder /workspace/srcMove/srcmove_runtime /opt/srcMove/srcmove_runtime

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["python3", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=4)"]

CMD ["gunicorn", "--config", "gunicorn.conf.py", "srcvisual.web.wsgi:app"]

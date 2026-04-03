FROM flyio/postgres-flex:17

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git \
        build-essential \
        postgresql-server-dev-17 && \
    git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git /tmp/pgvector && \
    cd /tmp/pgvector && \
    make && \
    make install && \
    rm -rf /tmp/pgvector && \
    apt-get remove -y git build-essential postgresql-server-dev-17 && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

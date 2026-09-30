FROM paradedb/paradedb:0.21.4-pg18

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

USER postgres

FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends tar gzip coreutils \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 seatrip \
    && useradd --system --uid 1001 --gid seatrip --no-create-home --shell /usr/sbin/nologin seatrip

WORKDIR /app
COPY --chown=seatrip:seatrip . /app
USER 1001:1001

ENTRYPOINT ["node", "/app/main.mjs"]

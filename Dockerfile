FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 CMS_ENABLED=0
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 CMS_ENABLED=1 CMS_DB_PATH=/app/data/seatrip.sqlite CMS_UPLOAD_DIR=/app/data/uploads
RUN groupadd --system --gid 1001 seatrip && useradd --system --uid 1001 --gid seatrip seatrip && mkdir -p /app/data && chown seatrip:seatrip /app/data
COPY --from=build --chown=seatrip:seatrip /app/.next/standalone ./
COPY --from=build --chown=seatrip:seatrip /app/.next/static ./.next/static
COPY --from=build --chown=seatrip:seatrip /app/public ./public
COPY --chown=seatrip:seatrip scripts/admin.mjs ./scripts/admin.mjs
# Email thông báo deploy chạy bằng node thuần trong container này.
COPY --chown=seatrip:seatrip scripts/release-notice.mjs ./scripts/release-notice.mjs
COPY --chown=seatrip:seatrip scripts/lib/release-notice.mjs ./scripts/lib/release-notice.mjs
# Nodemailer được Next đóng gói cho phần web, nhưng script CLI cần package thật.
COPY --from=dependencies --chown=seatrip:seatrip /app/node_modules/nodemailer ./node_modules/nodemailer
ARG APP_SHA=local
ENV APP_SHA=$APP_SHA
USER seatrip
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{if(!r.ok||(await r.json()).status!=='ok')process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server.js"]

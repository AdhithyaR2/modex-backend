# Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Install build deps
RUN apk add --no-cache python3 make g++ bash

# Copy package files first to leverage docker cache
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

RUN npm ci --production=false

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: production image
FROM node:18-alpine AS runner
WORKDIR /usr/src/app

# Minimal runtime deps
RUN apk add --no-cache libgcc libstdc++ bash

ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies + built files
COPY package.json package-lock.json* ./
RUN npm ci --production=true

# Copy compiled assets from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy migrations for convenience in container (optional)
COPY --from=builder /usr/src/app/migrations ./migrations

# Expose port
EXPOSE 3000

# Healthcheck (basic)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- --no-check-certificate http://localhost:3000/health || exit 1

# Run the server
CMD ["node", "dist/server.js"]

# --- Build stage: compile TypeScript, including devDependencies ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# --- Runtime stage: only production deps + compiled output ---
FROM node:20-alpine AS runtime

# better-sqlite3 is a native module; alpine needs these to run the
# prebuilt/compiled binary correctly
RUN apk add --no-cache libc6-compat

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

# Basic container-level health check hitting the existing "/" route
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
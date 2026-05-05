FROM node:lts-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM node:lts-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]

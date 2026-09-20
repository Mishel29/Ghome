FROM node:22.17.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json prisma7.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22.17.1-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json prisma7.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O - http://localhost:4000/healthz || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && npm run admin:bootstrap && node dist/server.js"]

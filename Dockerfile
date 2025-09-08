FROM node:18-alpine AS base

# 필요한 경우에만 의존성 설치
FROM base AS deps
# libc6-compat이 필요한 이유는 https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine 참조
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 의존성 설치
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 코드 재빌드
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 애플리케이션 빌드
RUN npm run build

# 프로덕션 이미지, 모든 파일을 복사하고 next 실행
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# 프리렌더 캐시에 대한 올바른 권한 설정
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 출력 추적을 자동으로 활용하여 이미지 크기 줄이기
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

FROM mcr.microsoft.com/playwright:v1.55.0-noble

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY policy.mjs shopping.mjs server.mjs ./

ENV NODE_ENV=production
ENV BROWSER_WORKER_HEADLESS=true
EXPOSE 8787

CMD ["node", "server.mjs"]

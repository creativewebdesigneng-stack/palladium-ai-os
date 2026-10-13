FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Keep every imported module in the built container, not only the entrypoint.
COPY policy.mjs shopping.mjs product-page.mjs dom-snapshot.mjs qa-inspection.mjs storage-state.mjs server.mjs ./

ENV NODE_ENV=production
ENV BROWSER_WORKER_HEADLESS=true
EXPOSE 8787

CMD ["node", "server.mjs"]

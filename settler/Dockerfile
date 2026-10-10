# Build from the repository root:  docker build -f settler/Dockerfile -t scrawl-settler .
FROM node:22-slim
WORKDIR /app
COPY settler/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund
# the settler shares the scoring and on-chain encoding code with the app
COPY src/logic ./src/logic
COPY src/solana/program.ts ./src/solana/program.ts
COPY settler/src ./settler/src
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "settler/src/server.ts"]

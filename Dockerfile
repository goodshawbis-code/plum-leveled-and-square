FROM node:24-slim

# System deps for image processing (replaces Nix packages from Replit)
RUN apt-get update && apt-get install -y \
    libfreetype6-dev \
    libharfbuzz-dev \
    libjpeg-turbo8-dev \
    libtiff-dev \
    libwebp-dev \
    zlib1g-dev \
    libopenjp2-7-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifest files first (layer-cache friendly)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Install deps and build
RUN pnpm install --frozen-lockfile
RUN cd artifacts/api-server && pnpm build

EXPOSE 10000
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

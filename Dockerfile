# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Generate Prisma Client (dummy DATABASE_URL since we don't need a real connection)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma Client in production environment (no config file needed, DATABASE_URL is enough)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Create a package.json in generated folder to force CommonJS module type
RUN echo '{"type":"commonjs"}' > /app/generated/prisma/package.json

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Ensure the generated client in dist also has CommonJS package.json
RUN mkdir -p /app/dist/generated/prisma && \
    echo '{"type":"commonjs"}' > /app/dist/generated/prisma/package.json

# Expose port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start:prod"]


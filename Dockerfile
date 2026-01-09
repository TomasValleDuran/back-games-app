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

# Force the generated Prisma client to use CommonJS
RUN echo '{"type":"commonjs"}' > /app/generated/prisma/package.json

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Force CommonJS in the built output too
RUN mkdir -p /app/dist/generated/prisma && \
    echo '{"type":"commonjs"}' > /app/dist/generated/prisma/package.json

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy generated Prisma client from builder (with CommonJS package.json)
COPY --from=builder /app/generated ./generated

# Copy built application from builder (with CommonJS package.json in dist/generated)
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start:prod"]


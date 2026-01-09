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

# Copy the generated Prisma client into dist where the compiled code expects it
RUN cp -r /app/generated /app/dist/

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder (includes dist/generated with Prisma client)
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start:prod"]


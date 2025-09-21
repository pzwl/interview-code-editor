# Docker configuration for code execution
FROM node:18-alpine

# Install additional runtime languages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    openjdk11 \
    g++ \
    gcc

# Create working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create temp directory for code execution
RUN mkdir -p temp

# Set permissions
RUN chmod 755 temp

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
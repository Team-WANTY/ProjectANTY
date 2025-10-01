# Use Node 22 (required by latest Expo CLI / npm)
FROM node:22-alpine

# Install dependencies we’ll need (git, bash, etc.)
RUN apk add --no-cache bash git

# Set working directory
WORKDIR /workspace/app-mobile

# Copy only package.json and package-lock.json first
# (this way `npm install` layer is cached until deps change)
COPY app-mobile/package*.json ./

# Install dependencies
RUN npm install

# Now copy the whole repo so shared code in ../common is available
WORKDIR /workspace
COPY . .

# Default command: start Expo in tunnel mode
WORKDIR /workspace/app-mobile
CMD ["npx", "expo", "start", "--tunnel"]

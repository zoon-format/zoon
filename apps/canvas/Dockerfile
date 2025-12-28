FROM oven/bun:latest

WORKDIR /app

# Copy pre-built frontend assets
COPY dist ./dist

# Copy bundled server (created via `bun build server.ts --target=bun --outfile=server-dist/server`)
COPY server-dist ./server-dist

EXPOSE 6789

CMD ["bun", "run", "server-dist/server"]

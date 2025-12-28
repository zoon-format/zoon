const port = Number(process.env.PORT) || 6789;
const server = Bun.serve({
    port,
    async fetch(req) {
        const url = new URL(req.url);

        // Static File Serving
        const distPath = './dist';
        let filePath = url.pathname;
        if (filePath === '/') filePath = '/index.html';

        const file = Bun.file(`${distPath}${filePath}`);
        if (await file.exists()) {
            return new Response(file);
        }

        // SPA Fallback (Serve index.html for any other route)
        const indexFile = Bun.file(`${distPath}/index.html`);
        if (await indexFile.exists()) {
            return new Response(indexFile);
        }

        return new Response("Not Found", { status: 404 });
    }
});

console.log(`Listening on localhost:${server.port}`);


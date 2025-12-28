import { Zoon } from '@zoon-format/zoon';
import { encode as encodeToon } from '@toon-format/toon';
import { GoogleGenerativeAI } from "@google/generative-ai";

const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === '/api/convert' && req.method === 'POST') {
            try {
                const body = await req.json() as { json: string };
                const data = typeof body.json === 'string' ? JSON.parse(body.json) : body.json;

                if (!Array.isArray(data)) return new Response("Input must be an array", { status: 400 });

                const jsonStr = JSON.stringify(data, null, 0);
                const toonStr = encodeToon(data);
                const ZoonStr = Zoon.encode(data);

                return Response.json({
                    stats: [
                        { name: 'JSON', chars: jsonStr.length, content: jsonStr },
                        { name: 'TOON', chars: toonStr.length, content: toonStr },
                        { name: 'Zoon', chars: ZoonStr.length, content: ZoonStr }
                    ]
                });
            } catch (e) {
                return Response.json({ error: String(e) }, { status: 500 });
            }
        }

        if (url.pathname === '/api/test-accuracy' && req.method === 'POST') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });

            const body = await req.json() as { json: string };
            const data = typeof body.json === 'string' ? JSON.parse(body.json) : body.json;
            const ZoonStr = Zoon.encode(data);

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `
        You are a data parser. 
        Zoon Format Rules:
        - Header starts with #
        - Columns separated by space
        - " means same value as above
        - > means value above + 1 (integers only)
        - Enums are 0-indexed based on header definition
        - Booleans: 1=true, 0=false
        
        Data:
        ${ZoonStr}
        
        Task: Convert the LAST row of the data into JSON object. Return ONLY the JSON.
        `;

            try {
                const result = await model.generateContent(prompt);
                return Response.json({
                    response: result.response.text(),
                    expected: data[data.length - 1]
                });
            } catch (e) {
                return Response.json({ error: String(e) }, { status: 500 });
            }
        }

        return new Response("Not Found", { status: 404 });
    }
});

console.log(`Listening on localhost:${server.port}`);


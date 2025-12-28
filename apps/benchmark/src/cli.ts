import { type ZoonSchema, encode as encodeZoon } from '@zoon-format/zoon';
import { encode as encodeToon } from '@toon-format/toon';
import { encode as encodeZon } from 'zon-format';

const ROLES = ['Admin', 'User', 'Guest', 'Moderator', 'SuperAdmin'];
const CITIES = ['New York', 'San Francisco', 'London', 'Tokyo', 'Berlin', 'Austin', 'Seattle', 'Paris'];
const LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL'];
const CATEGORIES = ['Electronics', 'Clothing', 'Home', 'Garden', 'Toys', 'Books', 'Automotive', 'Sports'];

interface User {
    id: number;
    role: string;
    active: boolean;
    city: string;
    score: number;
}

interface InventoryItem {
    sku: string;
    category: string;
    stock: number;
    price: number;
    available: boolean;
}

interface LogEntry {
    id: number;
    ts: number;
    level: string;
    service: string;
    msg: string;
}

interface IoTReading {
    did: number;
    temp: number;
    hum: number;
    status: string;
    loc: string;
}

function generateUsers(count: number): User[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        role: ROLES[Math.floor(Math.random() * ROLES.length)] as string,
        active: Math.random() > 0.2,
        city: CITIES[Math.floor(Math.random() * CITIES.length)] as string,
        score: Math.floor(Math.random() * 1000)
    }));
}

function generateInventory(count: number): InventoryItem[] {
    return Array.from({ length: count }, (_, i) => ({
        sku: `SKU-${1000 + i}`,
        category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)] as string,
        stock: Math.floor(Math.random() * 500),
        price: +(Math.random() * 100).toFixed(2),
        available: Math.random() > 0.1
    }));
}

function generateLogs(count: number): LogEntry[] {
    const baseTime = 1672531200000;
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        ts: baseTime + i * 1000,
        level: LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)] as string,
        service: `svc-${Math.floor(Math.random() * 5)}`,
        msg: `Request ${i} processed`
    }));
}

function generateIoT(count: number): IoTReading[] {
    return Array.from({ length: count }, (_, i) => ({
        did: i + 1,
        temp: +(20 + Math.random() * 10).toFixed(1),
        hum: Math.floor(40 + Math.random() * 40),
        status: Math.random() > 0.9 ? 'ERR' : 'OK',
        loc: `Room-${Math.floor(Math.random() * 10)}`
    }));
}

import { encodingForModel } from 'js-tiktoken';
const tokenizer = encodingForModel('gpt-5');

function countTokens(text: string): number {
    return tokenizer.encode(text).length;
}

function runBenchmark(name: string, data: object[], schema: ZoonSchema): void {
    console.log(`\n=== Benchmark: ${name} (${data.length} items) ===`);

    const jsonStr = JSON.stringify(data, null, 0);
    const jsonTokens = countTokens(jsonStr);

    const toonStr = encodeToon(data);
    const toonTokens = countTokens(toonStr);

    let zonStr = '';
    let zonTokens = 0;
    try {
        zonStr = encodeZon(data);
        zonTokens = countTokens(zonStr);
    } catch {
        zonTokens = -1;
    }

    const zoonStr = encodeZoon(data);
    const zoonTokens = countTokens(zoonStr);

    const results: Record<string, { tokens: number; ratio: string; saved: string }> = {
        JSON: { tokens: jsonTokens, ratio: '100%', saved: '—' },
        TOON: { tokens: toonTokens, ratio: `${((toonTokens / jsonTokens) * 100).toFixed(1)}%`, saved: `-${jsonTokens - toonTokens}` },
    };

    if (zonTokens > 0) {
        results['ZON'] = { tokens: zonTokens, ratio: `${((zonTokens / jsonTokens) * 100).toFixed(1)}%`, saved: `-${jsonTokens - zonTokens}` };
    }

    results['ZOON'] = { tokens: zoonTokens, ratio: `${((zoonTokens / jsonTokens) * 100).toFixed(1)}%`, saved: `-${jsonTokens - zoonTokens}` };

    console.table(results);

    const smallest = Math.min(toonTokens, zonTokens > 0 ? zonTokens : Infinity, zoonTokens);
    if (smallest === zoonTokens) {
        console.log(`✅ ZOON wins! ${zoonTokens} tokens (vs ZON: ${zonTokens}, TOON: ${toonTokens})`);
    } else if (smallest === zonTokens) {
        console.log(`⚠️ ZON wins at ${zonTokens} tokens (ZOON: ${zoonTokens})`);
    } else {
        console.log(`⚠️ TOON wins at ${toonTokens} tokens (ZOON: ${zoonTokens})`);
    }
}

runBenchmark('Users', generateUsers(5), {
    name: "User",
    fields: [
        { name: "id", type: "i+" },
        { name: "role", type: "e", options: ROLES },
        { name: "active", type: "b" },
        { name: "city", type: "e", options: CITIES },
        { name: "score", type: "i" }
    ]
});

runBenchmark('Users', generateUsers(500), {
    name: "User",
    fields: [
        { name: "id", type: "i+" },
        { name: "role", type: "e", options: ROLES },
        { name: "active", type: "b" },
        { name: "city", type: "e", options: CITIES },
        { name: "score", type: "i" }
    ]
});

runBenchmark('Inventory', generateInventory(20), {
    name: "Item",
    fields: [
        { name: "sku", type: "s" },
        { name: "category", type: "e", options: CATEGORIES },
        { name: "stock", type: "i" },
        { name: "price", type: "s" },
        { name: "available", type: "b" }
    ]
});

runBenchmark('Logs', generateLogs(50), {
    name: "Log",
    fields: [
        { name: "id", type: "i+" },
        { name: "ts", type: "i" },
        { name: "level", type: "e", options: LOG_LEVELS },
        { name: "service", type: "e", options: ['svc-0', 'svc-1', 'svc-2', 'svc-3', 'svc-4'] },
        { name: "msg", type: "s" }
    ]
});

runBenchmark('IoT', generateIoT(100), {
    name: "Sensor",
    fields: [
        { name: "did", type: "i+" },
        { name: "temp", type: "e", options: [] },
        { name: "hum", type: "i" },
        { name: "status", type: "e", options: ['OK', 'ERR'] },
        { name: "loc", type: "e", options: ['Room-0', 'Room-1', 'Room-2', 'Room-3', 'Room-4', 'Room-5', 'Room-6', 'Room-7', 'Room-8', 'Room-9'] }
    ]
});


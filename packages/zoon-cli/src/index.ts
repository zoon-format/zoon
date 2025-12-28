#!/usr/bin/env bun

import { encode, decode } from '@zoon-format/zoon';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface CliOptions {
    input?: string;
    output?: string;
    encode: boolean;
    decode: boolean;
    stats: boolean;
    help: boolean;
}

function parseArgs(args: string[]): CliOptions {
    const options: CliOptions = {
        encode: false,
        decode: false,
        stats: false,
        help: false,
    };

    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        switch (arg) {
            case '-o':
            case '--output':
                options.output = args[++i];
                break;
            case '-e':
            case '--encode':
                options.encode = true;
                break;
            case '-d':
            case '--decode':
                options.decode = true;
                break;
            case '--stats':
                options.stats = true;
                break;
            case '-h':
            case '--help':
                options.help = true;
                break;
            default:
                if (!arg?.startsWith('-') && !options.input) {
                    options.input = arg;
                }
                break;
        }
        i++;
    }

    return options;
}

function printHelp(): void {
    console.log(`
ZOON - ZOON (Zero Overhead Object Notation) CLI

Usage:
  ZOON [input] [options]

Options:
  -o, --output <file>   Output file path (prints to stdout if omitted)
  -e, --encode          Force encode mode (JSON → ZOON)
  -d, --decode          Force decode mode (ZOON → JSON)
  --stats               Show token count estimates and savings
  -h, --help            Show this help message

Examples:
  ZOON input.json -o output.ZOON     Encode JSON to ZOON
  ZOON data.ZOON -o output.json      Decode ZOON to JSON
  cat data.json | ZOON              Encode from stdin
  cat data.ZOON | ZOON --decode      Decode from stdin
  ZOON data.json --stats            Show token statistics
`);
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

async function readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of Bun.stdin.stream()) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.help) {
        printHelp();
        process.exit(0);
    }

    let input: string;
    let isEncode: boolean;

    if (options.input && options.input !== '-') {
        if (!existsSync(options.input)) {
            console.error(`Error: File not found: ${options.input}`);
            process.exit(1);
        }
        input = readFileSync(options.input, 'utf-8');

        if (options.encode) {
            isEncode = true;
        } else if (options.decode) {
            isEncode = false;
        } else {
            isEncode = options.input.endsWith('.json');
        }
    } else {
        input = await readStdin();
        isEncode = options.decode ? false : true;
    }

    let output: string;

    if (isEncode) {
        const data = JSON.parse(input);
        output = encode(data);
    } else {
        const data = decode(input);
        output = JSON.stringify(data, null, 2);
    }

    if (options.output) {
        writeFileSync(options.output, output);
        const action = isEncode ? 'Encoded' : 'Decoded';
        const sourceDesc = options.input || 'stdin';
        console.log(`\x1b[32m✔ ${action} ${sourceDesc} → ${options.output}\x1b[0m`);
    } else {
        console.log(output);
    }

    if (options.stats && isEncode) {
        const jsonTokens = estimateTokens(input);
        const ZOONTokens = estimateTokens(output);
        const saved = jsonTokens - ZOONTokens;
        const percent = ((saved / jsonTokens) * 100).toFixed(1);

        console.error(`\nℹ Token estimates: ~${jsonTokens} (JSON) → ~${ZOONTokens} (ZOON)`);
        console.error(`\x1b[32m✔ Saved ~${saved} tokens (-${percent}%)\x1b[0m`);
    }
}

main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});


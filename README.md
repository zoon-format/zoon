# Zero Overhead Object Notation (ZOON)

![ZOON Version](https://img.shields.io/badge/SPEC-v1.0-blueviolet) ![License](https://img.shields.io/badge/License-MIT-green)

**Zero Overhead Object Notation (ZOON)** is a token-optimized data format designed to maximize **LLM Context Window efficiency**. It removes all redundancy from your data, achieving token compression rates superior to JSON, TOON, ZON, and CSV. Written by Carsen Klock.

![ZOON Logo](zoon.svg)

## Why ZOON?

LLM Context Tokens cost money. Standard JSON is verbose. ZOON is **optimal**.

### Token Benchmarks (GPT-5 Tokenizer)

| Format   |    Tokens | Savings vs JSON |
| :------- | --------: | --------------: |
| **ZOON** | **6,274** |         **60%** |
| ZON      |     7,840 |             50% |
| TOON     |     8,630 |             45% |
| JSON     |    15,685 |               — |

### Key Features

| Feature               | Description                                    |
| --------------------- | ---------------------------------------------- |
| **Header Aliasing**   | `%a=long.prefix` reduces nested redundancy     |
| **Constant Hoisting** | `@field=value` moves repeated values to header |
| **Auto-Increment**    | `i+` type or `+N` count for implicit rows      |
| **Boolean Shorthand** | `1`/`0` (tabular) or `y`/`n` (inline)          |
| **Space Delimiters**  | More token-efficient than commas or pipes      |
| **Dual Format**       | Tabular (arrays) and Inline (objects)          |

### ZOON vs TOON

| Feature        | TOON                | ZOON                       |
| -------------- | ------------------- | -------------------------- |
| Delimiter      | Pipes `\|` / Commas | Spaces                     |
| Nested Data    | ❌ Flattened only   | ✅ Aliasing & Unflattening |
| Auto-increment | ❌ Must include IDs | ✅ `i+` or `+N`            |
| Single objects | ❌ Arrays only      | ✅ Inline `{...}`          |
| Type Safety    | ❌ None             | ✅ Header validated        |

## Installation

```bash
bun install @zoon-format/zoon
```

### CLI

```bash
bun install -g @zoon-format/cli
zoon input.json -o output.zoon --stats
```

## Quick Start

```typescript
import { encode, decode } from "@zoon-format/zoon";

// Arrays → Tabular format
const users = [
  { id: 1, role: "Admin", active: true },
  { id: 2, role: "User", active: true },
  { id: 3, role: "User", active: false },
];

console.log(encode(users));
// # id:i+ role=Admin|User active:b
// Admin 1
// User 1
// User 0

// Objects → Inline format
const config = {
  server: { host: "localhost", port: 3000, ssl: true },
  features: { darkMode: true, analytics: false },
};

console.log(encode(config));
// server:{host=localhost port:3000 ssl:y} features:{darkMode:y analytics:n}
```

## Format Overview

### Tabular Format (Arrays)

```
# id:i+ name:s role=Admin|User active:b
Alice Admin 1
Bob User 1
Carol User 0
```

**Types:**
| Code | Type | Description |
|------|------|-------------|
| `s` | String | Spaces → `_` |
| `i` | Integer | Whole numbers |
| `b` | Boolean | `1`/`0` |
| `i+` | Auto-Increment | Omitted from body |
| `a` | Array | `[a,b,c]` |

**Compression:**
| Marker | Meaning |
|--------|---------|
| `"` | Same as row above |
| `>` | Previous + 1 |
| `~` | Null |

### Inline Format (Objects)

```
server:{host=localhost port:3000 ssl:y} db:{driver=postgres port:5432}
```

| Pattern           | Type          |
| ----------------- | ------------- |
| `key=val`         | String        |
| `key:123`         | Number        |
| `key:y` / `key:n` | Boolean       |
| `key:~`           | Null          |
| `key:{...}`       | Nested Object |
| `key:[a,b]`       | Array         |

## CLI Usage

```bash
# Encode JSON to ZOON
zoon input.json -o output.zoon

# Decode ZOON to JSON
zoon data.zoon -o output.json

# Show token savings
zoon data.json --stats
```

## Packages

| Package             | Description                | Link                                               |
| ------------------- | -------------------------- | -------------------------------------------------- |
| `@zoon-format/zoon` | Core encode/decode library | [npm](https://npmjs.com/package/@zoon-format/zoon) |
| `@zoon-format/cli`  | Command-line interface     | [npm](https://npmjs.com/package/@zoon-format/cli)  |
| `zoon-format`       | Python bindings            | [PyPI](https://pypi.org/project/zoon-format/)      |
| `zoon-go`           | Go bindings                | [GitHub](https://github.com/zoon-format/zoon-go)   |
| `zoon-rust`         | Rust bindings              | [crates.io](https://crates.io/crates/zoon-rust)    |

## Links

- [Full Specification](./SPEC.md)
- [Playground](https://zoonformat.org)

## License

MIT © 2025-PRESENT Carsen Klock

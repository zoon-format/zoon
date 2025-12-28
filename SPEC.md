# Zero Overhead Object Notation (ZOON) Specification v1.0

**Status:** Stable  
**Version:** 1.0.0  
**Date:** 2025-12-27  
**Author:** Carsen Klock  
**License:** MIT

---

## Abstract

Zero Overhead Object Notation (ZOON) is a token-optimized text format designed to minimize token consumption when transmitting structured data to Large Language Models (LLMs). ZOON achieves 40-60% token reduction compared to JSON by eliminating redundant syntax, using compact type markers, and employing vertical compression for repetitive data.

ZOON supports two encoding modes:

1. **Tabular Format** for arrays of uniform objects (header-based schema with row compression)
2. **Inline Format** for single objects with nested properties (space-delimited key-value pairs)

This specification defines ZOON's concrete syntax, type system, encoding rules, and conformance requirements.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [Data Model](#3-data-model)
4. [Tabular Format](#4-tabular-format)
5. [Header Aliases](#5-header-aliases)
6. [Constant Value Hoisting](#6-constant-value-hoisting)
7. [Inline Format](#7-inline-format)
8. [Type System](#8-type-system)
9. [Encoding Rules](#9-encoding-rules)
10. [Decoding Rules](#10-decoding-rules)
11. [Conformance](#11-conformance)
12. [Security Considerations](#12-security-considerations)
13. [Comparison with Other Formats](#13-comparison-with-other-formats)
14. [IANA Considerations](#14-iana-considerations)
15. [Reference Implementations](#15-reference-implementations)

---

## 1. Introduction

### 1.1 Purpose and Scope

ZOON (Zero Overhead Object Notation) is designed as a compact, deterministic representation of structured data optimized for LLM token efficiency. Unlike general-purpose formats, ZOON specifically targets the tokenization patterns of Byte-Pair Encoding (BPE) tokenizers used by GPT, Claude, Gemini, and similar models.

### 1.2 Design Goals

- **Minimize Token Count**: Reduce context window consumption for LLM interactions
- **Maintain Readability**: Human-readable structure without binary encoding
- **Preserve Fidelity**: Lossless round-trip conversion with JSON
- **Support Nesting**: Handle both flat tables and deeply nested objects

### 1.3 When to Use ZOON

Use ZOON when:

- Sending structured data to LLMs (ChatGPT, Claude, Gemini)
- Arrays contain uniform objects with repeated keys
- Token costs or context limits are a concern
- Deterministic, compact output is desired

ZOON is not intended to replace:

- JSON for general API communication
- Binary formats for maximum compression
- CSV for simple flat data

### 1.4 Relationship to JSON

ZOON models the JSON data model exactly: objects, arrays, strings, numbers, booleans, and null. Any valid JSON can be encoded to ZOON and decoded back without loss.

### 1.5 Relationship to TOON

ZOON extends the concepts introduced by TOON (Token-Oriented Object Notation) with:

- **Auto-increment columns** (`i+` type omits sequential IDs)
- **Inline object format** for non-array structures
- **Smart enum detection** for low-cardinality strings
- **Space delimiters** (more token-efficient than TOON's pipes)

---

## 2. Terminology

### 2.1 Document Structure

- **ZOON Document**: A UTF-8 text string formatted according to this specification
- **Header**: The first line of a Tabular format document, starting with `#`
- **Body**: All lines following the header containing data values
- **Row**: A single line of space-delimited values in Tabular format

### 2.2 Data Terms

- **Primitive**: A string, number, boolean, or null value
- **Object**: An unordered collection of key-value pairs
- **Array**: An ordered sequence of values
- **Field**: A key in an object or column in a table

### 2.3 Encoding Terms

- **Active Delimiter**: The character used to separate values (space in ZOON)

---

## 3. Data Model

ZOON represents the JSON data model:

```typescript
type ZOONValue = string | number | boolean | null | ZOONObject | ZOONArray;

type ZOONObject = { [key: string]: ZOONValue };
type ZOONArray = ZOONValue[];
```

### 3.1 Ordering

- Array element order MUST be preserved
- Object key order MUST be preserved as encountered

### 3.2 Numbers

- Encoders MUST emit numbers without exponential notation
- No leading zeros except for `0.x` decimals
- No trailing zeros in fractional parts
- `-0` normalizes to `0`

### 3.3 Special Values

- `NaN`, `+Infinity`, `-Infinity` MUST be encoded as `null`
- `undefined` MUST be encoded as `null`

---

## 4. Tabular Format

The Tabular format is used for arrays of uniform objects.

### 4.1 Structure

```
# <field>:<type> <field>:<type> ...
<value> <value> ...
<value> <value> ...
```

### 4.2 Header Syntax

The header line MUST:

- Start with `#` followed by a space
- Contain space-separated field definitions
- Each field has format `name:type` or `name=enum|values`

**Example:**

```ZOON
# id:i+ name:s role=Admin|User active:b
Alice Admin 1
Bob User 0
```

### 4.3 Tabular Detection

An array MUST use Tabular format when ALL of:

- Every element is an object
- All objects have identical keys
- All values are primitives (no nested objects/arrays)

### 4.4 Field Types

| Code | Type           | Description                                             |
| ---- | -------------- | ------------------------------------------------------- |
| `s`  | String         | Text value, spaces replaced with `_`                    |
| `i`  | Integer        | Whole number                                            |
| `b`  | Boolean        | `1` for true, `0` for false                             |
| `e`  | Enum           | Defined via `name=val1\|val2`, encoded as literal value |
| `i+` | Auto-Increment | Sequential ID starting at 1, omitted from body          |
| `a`  | Array          | Encoded as `[val1,val2,...]`                            |

## 5. Header Aliases

For deeply nested objects, repeated path prefixes can be aliased to reduce tokens.

**Syntax:**

```
%alias=prefix.path
# %alias.field:type ...
```

**Example:**

```ZOON
%sp=services.postgres %sr=services.redis
# replica:s %sp.status:s %sp.ms:i %sr.status:s %sr.ms:i
gateway-1 up 167 up 203
gateway-2 up 1837 up 1819
```

**Rules:**

- Alias definitions MUST appear before the header line
- Alias names MUST be lowercase alphanumeric
- Field references use `%alias.suffix` notation
- Decoders MUST expand aliases before processing

## 6. Constant Value Hoisting

Fields with identical values across all rows can be hoisted to the header to avoid repetition.

**Syntax:**

```
# @field=value @field:number field:type ...
```

**Example:**

```ZOON
# @status=healthy @timestamp=2025-12-28T10:27:47 replica:s response_ms:i
gateway-1 167
gateway-2 1837
gateway-3 1833
```

**Rules:**

- Hoisted fields are prefixed with `@`
- String constants use `@field=value` syntax
- Numeric/boolean constants use `@field:value` syntax
- Hoisted fields are omitted from data rows
- Decoders MUST inject hoisted values into each decoded object

## 7. Inline Format

The Inline format encodes single objects with nested properties.

### 7.1 Structure

Space-separated key-value pairs on a single line:

```
key:value key=string key:{nested}
```

### 7.2 Syntax

| Pattern     | Type          | Example                         |
| ----------- | ------------- | ------------------------------- |
| `key=value` | String        | `name=John_Doe`                 |
| `key:123`   | Number        | `port:3000`                     |
| `key:y`     | Boolean true  | `enabled:y`                     |
| `key:n`     | Boolean false | `debug:n`                       |
| `key:~`     | Null          | `optional:~`                    |
| `key:[a,b]` | Array         | `tags:[web,api]`                |
| `key:{...}` | Nested Object | `db:{host=localhost port:5432}` |

### 7.3 Nesting

Objects are nested using curly braces `{...}`:

```ZOON
server:{host=localhost port:3000 ssl:y} database:{driver=postgres port:5432}
```

Decodes to:

```json
{
  "server": { "host": "localhost", "port": 3000, "ssl": true },
  "database": { "driver": "postgres", "port": 5432 }
}
```

### 7.4 String Escaping

- Spaces in strings MUST be replaced with underscores
- Underscores in output are converted back to spaces on decode

---

## 8. Type System

### 8.1 Strings

**Encoding:**

- Use `=` separator: `name=value`
- Replace spaces with underscores: `city=New_York`
- No quotes required unless containing special characters

**Decoding:**

- Replace underscores with spaces
- Tokens after `=` are always strings

### 8.2 Numbers

**Encoding:**

- Use `:` separator: `count:42`
- Emit in canonical decimal form
- No exponential notation

**Decoding:**

- Tokens matching `/^-?\d+(\.\d+)?$/` are numbers
- All other tokens after `:` follow type inference rules

### 8.3 Booleans

**Tabular Format:**

- `1` = true, `0` = false

**Inline Format:**

- `y` = true, `n` = false

### 8.4 Null

- Represented as `~` in both formats

### 8.5 Arrays

**In Tabular fields:**

- Encoded as `[val1,val2,val3]`
- No spaces inside brackets

**As standalone values:**

- Use Tabular format if uniform objects
- Otherwise encode inline: `items:[a,b,c]`

---

## 9. Encoding Rules

### 9.1 Format Selection

Encoders MUST:

1. If input is an array of uniform objects with primitive values → Tabular Format
2. Otherwise → Inline Format

### 9.2 Enum Detection

Encoders SHOULD detect enums when:

- A string field has ≤10 unique values
- The field appears in multiple rows

Detected enums are encoded as `field=val1|val2|...` in header.

### 9.3 Key Ordering

Object keys MUST be emitted in encounter order.

### 9.4 Whitespace

- No trailing spaces on any line
- No trailing newline at end of document
- Lines terminated with LF (U+000A)

---

## 10. Decoding Rules

### 10.1 Format Detection

- If first line starts with `#` → Tabular Format
- Otherwise → Inline Format

### 10.2 Token Parsing

For unquoted tokens:

1. `true`, `false` → boolean (Tabular only)
2. `1`, `0` in boolean columns → boolean
3. `y`, `n` → boolean (Inline only)
4. `~` → null
5. Numeric pattern → number
6. Everything else → string (with `_` → space)

### 10.3 Type Inference

Decoders MUST use the header types in Tabular format.
In Inline format, decoders infer types from separator:

- `=` separator → string
- `:` separator → check value for `y`/`n`/`~`/number, else string

---

## 11. Conformance

### 11.1 Encoder Requirements

Conformant encoders MUST:

- [ ] Produce valid UTF-8 output
- [ ] Use LF line endings
- [ ] Preserve array order
- [ ] Preserve object key order

- [ ] Detect and encode enums
- [ ] Emit canonical number form

### 11.2 Decoder Requirements

Conformant decoders MUST:

- [ ] Accept both Tabular and Inline formats
- [ ] Parse header field definitions

- [ ] Handle `~` as null
- [ ] Convert `_` to space in strings
- [ ] Reconstruct nested objects from `{...}`

---

## 12. Security Considerations

- String escaping rules prevent injection attacks
- Encoders SHOULD limit input size to prevent memory exhaustion
- Decoders SHOULD validate structure before processing

---

## 13. Comparison with Other Formats

### 13.1 ZOON vs JSON

| Feature            | JSON                       | ZOON             |
| ------------------ | -------------------------- | ---------------- |
| Key repetition     | Every object               | Once in header   |
| Boolean tokens     | `true`/`false` (4-5 chars) | `1`/`0` (1 char) |
| Auto-increment IDs | Explicit                   | Implicit `i+`    |

### 13.2 ZOON vs TOON

| Feature             | TOON           | ZOON              |
| ------------------- | -------------- | ----------------- |
| Delimiter           | Pipe `\|`      | Space             |
| Type Safety         | ❌             | ✅ (Header types) |
| ID compression      | ❌             | ✅ `i+` omitted   |
| Increment shorthand | ❌             | ❌                |
| Single objects      | ❌ Arrays only | ✅ Inline `{...}` |
| Smart enums         | ❌             | ✅ Header types   |
| Token efficiency    | Good           | Better            |

### 13.3 Typical Savings

| Dataset             | JSON    | TOON    | ZOON    | vs JSON | vs TOON |
| ------------------- | ------- | ------- | ------- | ------- | ------- |
| Users (8 rows)      | 216 tok | 148 tok | 103 tok | -52%    | -30%    |
| Orders (20 rows)    | 528 tok | 380 tok | 252 tok | -52%    | -34%    |
| Employees (15 rows) | 400 tok | 280 tok | 170 tok | -58%    | -39%    |
| Config Object       | 76 tok  | —       | 58 tok  | -24%    | N/A     |

---

## 14. IANA Considerations

### 14.1 Media Type (Provisional)

- **Type name:** text
- **Subtype name:** ZOON (provisional)
- **File extension:** `.ZOON`
- **MIME type:** `text/ZOON` or `application/vnd.ZOON`
- **Encoding:** UTF-8

---

## 15. Reference Implementations

### 15.1 Packages

| Package               | Description                                |
| --------------------- | ------------------------------------------ |
| `@zoon-format/zoon`   | Core TypeScript library with encode/decode |
| `@zoon-format/cli`    | Command-line interface                     |
| `@zoon-format/python` | Python bindings                            |

### 15.2 CLI Usage

```bash
# Encode JSON to ZOON
ZOON input.json -o output.ZOON

# Decode ZOON to JSON
ZOON data.ZOON -o output.json

# Show token statistics
ZOON data.json --stats

# Pipeline support
cat data.json | ZOON > output.ZOON
```

### 15.3 Programmatic Usage

```typescript
import { encode, decode, ZOON } from "@zoon-format/zoon";

// Encode array to Tabular format
const ZOON = encode(users);

// Decode back to JSON
const data = decode(ZOON);

// Class-based API
const encoded = ZOON.encode(data);
const decoded = ZOON.decode(encoded);
```

---

## Appendix A: Examples

### A.1 Tabular Array

**JSON Input:**

```json
[
  { "id": 1, "name": "Alice", "role": "Admin", "active": true },
  { "id": 2, "name": "Bob", "role": "User", "active": true },
  { "id": 3, "name": "Carol", "role": "User", "active": false }
]
```

**ZOON Output:**

```ZOON
# id:i+ name:s role=Admin|User active:b
Alice Admin 1
Bob User 1
Carol User 0
```

### A.2 Nested Object

**JSON Input:**

```json
{
  "server": { "host": "localhost", "port": 3000, "ssl": true },
  "database": { "driver": "postgres", "host": "db.example.com", "port": 5432 }
}
```

**ZOON Output:**

```ZOON
server:{host=localhost port:3000 ssl:y} database:{driver=postgres host=db.example.com port:5432}
```

### A.3 Mixed Content

**JSON Input:**

```json
{
  "name": "My App",
  "version": "1.0.0",
  "scripts": { "dev": "vite", "build": "tsc" },
  "dependencies": { "react": "^18.0.0" }
}
```

**ZOON Output:**

```ZOON
name=My_App version=1.0.0 scripts:{dev=vite build=tsc} dependencies:{react=^18.0.0}
```

---

## Appendix B: Changelog

### v1.0.0 (2025-12-27)

- Initial specification
- Tabular format with header-based schema
- Inline format with curly brace nesting

- Auto-increment column type (`i+`)
- Boolean shorthand (`y`/`n`)
- Smart enum detection
- Header Aliasing (`%a=prefix`)
- Constant Value Hoisting (`@field=val`)

---

## License

MIT License © 2025-PRESENT Carsen Klock

This specification and reference implementations are released under the MIT License.

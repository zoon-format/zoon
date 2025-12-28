export type ZoonSchemaFieldType = 'i' | 'i+' | 's' | 't' | 'b' | 'e' | 'a';

export interface ZoonSchemaField {
    name: string;
    type: ZoonSchemaFieldType;
    options?: string[];
}

export interface ZoonSchema {
    name: string;
    fields: ZoonSchemaField[];
}

export interface EncodeOptions {
    schema?: ZoonSchema;
    inferEnums?: boolean;
    enumThreshold?: number;
}

type DataRow = { [key: string]: unknown };

function flattenObject(obj: DataRow, prefix = ''): DataRow {
    const result: DataRow = {};

    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
            result[newKey] = value;
        } else if (Array.isArray(value)) {
            result[newKey] = value;
        } else if (typeof value === 'object') {
            Object.assign(result, flattenObject(value as DataRow, newKey));
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

function unflattenObject(flat: DataRow): DataRow {
    const result: DataRow = {};

    for (const [key, value] of Object.entries(flat)) {
        const parts = key.split('.');
        let current = result;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]!;
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part] as DataRow;
        }

        current[parts[parts.length - 1]!] = value;
    }

    return result;
}

function inferSchema(data: DataRow[], options: EncodeOptions = {}): ZoonSchema {
    if (data.length === 0) {
        return { name: 'Item', fields: [] };
    }

    const sample = data[0]!;
    const fields: ZoonSchemaField[] = [];
    const inferEnums = options.inferEnums !== false;
    const enumThreshold = options.enumThreshold ?? 10;

    for (const [key, value] of Object.entries(sample)) {
        if (typeof value === 'boolean') {
            fields.push({ name: key, type: 'b' });
            continue;
        }

        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                const values = data.map((row) => row[key] as number);
                const isSequential = values.every((v, i) => i === 0 || v === values[i - 1]! + 1);
                if (isSequential && values[0] === 1) {
                    fields.push({ name: key, type: 'i+' });
                    continue;
                }
            }
            fields.push({ name: key, type: 'i' });
            continue;
        }

        if (Array.isArray(value)) {
            fields.push({ name: key, type: 'a' });
            continue;
        }

        if (typeof value === 'string' && inferEnums) {
            const uniqueValues = new Set(data.map((row) => row[key]));
            if (uniqueValues.size <= enumThreshold && uniqueValues.size < data.length * 0.5) {
                fields.push({ name: key, type: 'e', options: Array.from(uniqueValues).map(String).sort() });
                continue;
            }
        }

        if (typeof value === 'string') {
            fields.push({ name: key, type: 's' });
            continue;
        }

        fields.push({ name: key, type: 's' });
    }

    return { name: 'Item', fields };
}

function detectAliases(fields: ZoonSchemaField[]): Map<string, string> {
    const prefixCounts = new Map<string, number>();

    for (const field of fields) {
        const parts = field.name.split('.');
        if (parts.length > 1) {
            for (let i = 1; i < parts.length; i++) {
                const prefix = parts.slice(0, i).join('.');
                prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
            }
        }
    }

    const prefixSavings = Array.from(prefixCounts.entries()).map(([prefix, count]) => {
        const aliasLen = 2;
        const charsSavedPerUse = prefix.length - aliasLen;
        const totalCharsSaved = charsSavedPerUse * count;
        const aliasCost = prefix.length + 4;
        const netSavings = totalCharsSaved - aliasCost;
        return { prefix, count, netSavings };
    });

    prefixSavings.sort((a, b) => b.netSavings - a.netSavings);

    const aliases = new Map<string, string>();
    let aliasIndex = 0;
    const usedAliases = new Set<string>();
    const aliasedFields = new Set<string>();

    for (const { prefix, netSavings } of prefixSavings) {
        if (netSavings <= 0) continue;

        const wouldAlias = fields.filter(f =>
            f.name.startsWith(prefix + '.') && !aliasedFields.has(f.name)
        );
        if (wouldAlias.length < 2) continue;

        const parts = prefix.split('.');
        let alias = parts.map(p => p[0]).join('').toLowerCase();

        let attempts = 0;
        while ((usedAliases.has(alias) || alias.length < 2) && attempts < 26) {
            alias = String.fromCharCode(97 + aliasIndex);
            aliasIndex++;
            attempts++;
        }

        usedAliases.add(alias);
        aliases.set(prefix, alias);

        for (const f of wouldAlias) {
            aliasedFields.add(f.name);
        }

        if (aliases.size >= 10) break;
    }

    return aliases;
}

function applyAliases(fieldName: string, aliases: Map<string, string>): string {
    for (const [prefix, alias] of aliases) {
        if (fieldName.startsWith(prefix + '.')) {
            return '%' + alias + fieldName.slice(prefix.length);
        }
        if (fieldName === prefix) {
            return '%' + alias;
        }
    }
    return fieldName;
}

function encodeWithSchema(data: DataRow[], schema: ZoonSchema): string {
    const effectiveSchema: ZoonSchema = { ...schema, fields: [...schema.fields] };
    const constantFields = new Map<string, unknown>();

    if (data.length > 1) {
        for (let i = effectiveSchema.fields.length - 1; i >= 0; i--) {
            const field = effectiveSchema.fields[i];
            if (!field || field.type === 'i+') continue;

            const firstVal = data[0]![field.name];
            const isConstant = data.every(row => {
                const val = row[field.name];
                return val === firstVal || (val == null && firstVal == null);
            });

            if (isConstant && firstVal !== undefined) {
                constantFields.set(field.name, firstVal);
                effectiveSchema.fields.splice(i, 1);
            }
        }
    }

    if (data.length > 0) {
        for (let i = 0; i < effectiveSchema.fields.length; i++) {
            const field = effectiveSchema.fields[i];
            if (!field) continue;
            if (field.type === 'e' && field.options && field.options.length > 0) {
                const usedValues = new Set<string>();
                for (const row of data) {
                    const val = row[field.name];
                    if (val !== undefined && val !== null) {
                        usedValues.add(String(val));
                    }
                }
                if (usedValues.size < field.options.length) {
                    const newOptions = Array.from(usedValues).sort();
                    effectiveSchema.fields[i] = { ...field, options: newOptions };
                }
            }
        }
    }

    const aliases = detectAliases(effectiveSchema.fields);

    let output = '';

    if (aliases.size > 0) {
        const aliasDefs = Array.from(aliases.entries())
            .map(([prefix, alias]) => `%${alias}=${prefix}`)
            .join(' ');
        output += aliasDefs + '\n';
    }

    output += '#';

    if (constantFields.size > 0) {
        for (const [name, value] of constantFields) {
            const aliasedName = applyAliases(name, aliases);
            const safeName = aliasedName.replace(/ /g, '_');
            if (typeof value === 'boolean') {
                output += ` @${safeName}:${value ? 'y' : 'n'}`;
            } else if (typeof value === 'number') {
                output += ` @${safeName}:${value}`;
            } else {
                output += ` @${safeName}=${String(value).replace(/ /g, '_')}`;
            }
        }
    }

    for (const field of effectiveSchema.fields) {
        const aliasedName = applyAliases(field.name, aliases);
        const safeName = aliasedName.replace(/ /g, '_');
        if (field.type === 'e' && field.options) {
            const safeOptions = field.options.map((o) => o.replace(/ /g, '_'));
            output += ` ${safeName}=${safeOptions.join('|')}`;
        } else {
            output += ` ${safeName}:${field.type}`;
        }
    }

    // Check if we need explicit row count (if all fields are non-consuming)
    const hasConsumingFields = effectiveSchema.fields.some(f => f.type !== 'i+');
    if (!hasConsumingFields && data.length > 0) {
        output += ` +${data.length}`;
    }

    output += '\n';

    if (hasConsumingFields) {
        for (const row of data) {
            const parts: string[] = [];
            for (let i = 0; i < effectiveSchema.fields.length; i++) {
                const field = effectiveSchema.fields[i];
                if (!field || field.type === 'i+') continue;

                const val = row[field.name];
                if (val === null || val === undefined) parts.push('~');
                else if (field.type === 'b') parts.push(val ? '1' : '0');
                else if (field.type === 'e' && field.options) parts.push(String(val).replace(/ /g, '_'));
                else if (field.type === 'a') {
                    const arr = val as unknown[];
                    const encoded = arr.map(item => typeof item === 'string' ? item.replace(/ /g, '_') : String(item)).join(',');
                    parts.push(`[${encoded}]`);
                }
                else parts.push(String(val).replace(/ /g, '_'));
            }
            output += parts.join(' ') + '\n';
        }
    }

    return output.trim();
}

/**
 * Encodes a JavaScript value into ZOON format string.
 * 
 * ZOON (Zero Overhead Object Notation) is a token-optimized text format
 * designed to minimize token consumption when transmitting structured data to LLMs.
 * Achieves 40-60% token reduction compared to JSON.
 * 
 * @param input - Any JavaScript value (objects, arrays, primitives)
 * @param options - Optional encoding configuration
 * @returns ZOON formatted string
 * 
 * @example
 * // Single object (inline format)
 * encode({ name: 'Alice', age: 30, active: true })
 * // "name=Alice age:30 active:y"
 * 
 * @example
 * // Array of objects (tabular format)
 * encode([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }])
 * // "# id:i+ name:s\nAlice\nBob"
 * 
 * @example
 * // Nested objects
 * encode({ server: { host: 'localhost', port: 3000 } })
 * // "server:{host=localhost port:3000}"
 * 
 * @example
 * // With options
 * encode(data, { inferEnums: true, enumThreshold: 5 })
 */
export function encode(input: unknown, options?: EncodeOptions): string {
    if (input === null || input === undefined) {
        return '#\n~';
    }

    if (typeof input !== 'object') {
        return `# value:s\n${String(input).replace(/ /g, '_')}`;
    }

    if (Array.isArray(input)) {
        if (input.length === 0) {
            return '# (empty)';
        }

        if (typeof input[0] !== 'object' || input[0] === null) {
            return `# value:s\n${input.map((v) => String(v).replace(/ /g, '_')).join('\n')}`;
        }

        const flatData = input.map((row) => flattenObject(row as DataRow));
        const schema = options?.schema ?? inferSchema(flatData, options);
        return encodeWithSchema(flatData, schema);
    }

    return encodeObject(input as DataRow, '');
}

function encodeObject(obj: DataRow, _indent: string): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        const safeKey = key.replace(/ /g, '_');

        if (value === null || value === undefined) {
            parts.push(`${safeKey}:~`);
        } else if (typeof value === 'boolean') {
            parts.push(`${safeKey}:${value ? 'y' : 'n'}`);
        } else if (typeof value === 'number') {
            parts.push(`${safeKey}:${value}`);
        } else if (typeof value === 'string') {
            parts.push(`${safeKey}=${value.replace(/ /g, '_')}`);
        } else if (Array.isArray(value)) {
            const items = value.map((item) => {
                if (typeof item === 'string') return item.replace(/ /g, '_');
                return String(item);
            }).join(',');
            parts.push(`${safeKey}:[${items}]`);
        } else if (typeof value === 'object') {
            parts.push(`${safeKey}:{${encodeObject(value as DataRow, '')}}`);
        }
    }

    return parts.join(' ');
}

/**
 * Decodes a ZOON formatted string back into JavaScript objects.
 * 
 * Supports both Tabular format (arrays) and Inline format (single objects).
 * Automatically detects format based on header presence.
 * 
 * @param zoonString - ZOON formatted string to decode
 * @returns Array of decoded objects
 * 
 * @example
 * // Decode tabular format
 * decode('# id:i+ name:s\nAlice\nBob')
 * // [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
 * 
 * @example
 * // Decode inline format
 * decode('host=localhost port:3000 ssl:y')
 * // [{ host: 'localhost', port: 3000, ssl: true }]
 * 
 * @example
 * // Decode with nulls and booleans
 * decode('# name:s active:b\nAlice 1\nBob 0')
 * // [{ name: 'Alice', active: true }, { name: 'Bob', active: false }]
 */
export function decode(zoonString: string): DataRow[] {
    const lines = zoonString.trim().split('\n');
    if (lines.length === 0) return [];

    const aliases = new Map<string, string>();
    let headerIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();
        if (line.startsWith('%')) {
            const parts = line.split(' ');
            for (const part of parts) {
                if (part.includes('=')) {
                    const [alias, prefix] = part.split('=');
                    if (alias && prefix) {
                        aliases.set(alias.substring(1), prefix);
                    }
                }
            }
        } else if (line.startsWith('#')) {
            headerIndex = i;
            break;
        } else if (line) {
            // Found non-alias, non-header content before header?
            // If we haven't found a header yet, and this isn't an alias line, it must be inline format
            // But inline format shouldn't have preceeding alias lines in current spec (spec says aliases for nested objects)
            // Actually spec example shows aliases with tabular.
            // If we find data before '#', it's inline.
            if (aliases.size === 0) {
                return [decodeKeyValue(lines)];
            }
            // If we found aliases but no header, and now data... that's undefined in spec for inline, assume inline doesn't support % lines yet or treat as error?
            // For now assume inline doesn't use pre-header aliases.
            return [decodeKeyValue(lines)];
        }
    }

    if (headerIndex !== -1) {
        return decodeTabular(lines.slice(headerIndex), aliases);
    } else {
        return [decodeKeyValue(lines)];
    }
}

function decodeKeyValue(lines: string[]): DataRow {
    const input = lines.join(' ').trim();
    return parseInlineObject(input);
}

function parseInlineObject(input: string): DataRow {
    const result: DataRow = {};
    let i = 0;

    while (i < input.length) {
        while (i < input.length && input[i] === ' ') i++;
        if (i >= input.length) break;

        let keyEnd = i;
        while (keyEnd < input.length && input[keyEnd] !== ':' && input[keyEnd] !== '=') keyEnd++;
        if (keyEnd >= input.length) break;

        const key = input.slice(i, keyEnd).replace(/_/g, ' ');
        const sep = input[keyEnd];
        i = keyEnd + 1;

        if (sep === '=' || sep === ':') {
            if (i < input.length && input[i] === '{') {
                let depth = 1;
                let start = i + 1;
                i++;
                while (i < input.length && depth > 0) {
                    if (input[i] === '{') depth++;
                    else if (input[i] === '}') depth--;
                    i++;
                }
                const nested = input.slice(start, i - 1);
                result[key] = parseInlineObject(nested);
            } else if (i < input.length && input[i] === '[') {
                let end = i + 1;
                while (end < input.length && input[end] !== ']') end++;
                const inner = input.slice(i + 1, end);
                result[key] = inner ? inner.split(',').map(s => s.replace(/_/g, ' ')) : [];
                i = end + 1;
            } else {
                let valueEnd = i;
                while (valueEnd < input.length && input[valueEnd] !== ' ') valueEnd++;
                const value = input.slice(i, valueEnd);
                i = valueEnd;

                if (sep === '=') {
                    result[key] = value.replace(/_/g, ' ');
                } else {
                    if (value === '~') {
                        result[key] = null;
                    } else if (value === 'y') {
                        result[key] = true;
                    } else if (value === 'n') {
                        result[key] = false;
                    } else if (!isNaN(Number(value))) {
                        result[key] = Number(value);
                    } else {
                        result[key] = value.replace(/_/g, ' ');
                    }
                }
            }
        }
    }

    return result;
}

function decodeTabular(lines: string[], aliases: Map<string, string> = new Map()): DataRow[] {
    const headerLine = lines[0];
    if (!headerLine) throw new Error('Invalid ZEN Header');
    const headerParts = headerLine.split(' ');
    if (headerParts[0] !== '#') throw new Error('Invalid ZEN Header');

    const fields: ZoonSchemaField[] = [];
    const constantFields: Record<string, unknown> = {};
    let explicitRowCount = 0;

    for (let i = 1; i < headerParts.length; i++) {
        const part = headerParts[i];
        if (!part) continue;

        if (part.startsWith('+')) {
            const count = parseInt(part.substring(1));
            if (!isNaN(count)) {
                explicitRowCount = count;
                continue;
            }
        }

        let name = '';
        let type = '';
        let options: string[] | undefined;
        let isConstant = false;
        let constValue: string | undefined;

        if (part.startsWith('@')) {
            isConstant = true;
            if (part.includes('=')) {
                // @field=value (string)
                const [n, v] = part.substring(1).split('=');
                name = n!;
                constValue = v;
                type = 's'; // Implicit string
            } else if (part.includes(':')) {
                // @field:value (number/bool)
                const [n, v] = part.substring(1).split(':');
                name = n!;
                constValue = v;
                type = 'const'; // Marker
            }
        } else if (part.includes('=')) {
            const [n, opts] = part.split('=');
            name = n!;
            type = 'e';
            options = opts!.split('|');
        } else if (part.includes(':')) {
            const [n, t] = part.split(':');
            name = n!;
            type = t!;
        }

        if (name) {
            // Expand aliases: %a.field -> prefix.field
            if (name.startsWith('%')) {
                const dotIdx = name.indexOf('.');
                if (dotIdx !== -1) {
                    const alias = name.substring(1, dotIdx);
                    const suffix = name.substring(dotIdx + 1);
                    const prefix = aliases.get(alias);
                    if (prefix) {
                        name = prefix + '.' + suffix;
                    }
                } else {
                    // %a alone -> prefix
                    const alias = name.substring(1);
                    const prefix = aliases.get(alias);
                    if (prefix) name = prefix;
                }
            }

            if (isConstant && constValue !== undefined) {
                if (type === 's') {
                    constantFields[name] = constValue.replace(/_/g, ' ');
                } else {
                    // infer type from value
                    if (constValue === 'y') constantFields[name] = true;
                    else if (constValue === 'n') constantFields[name] = false;
                    else constantFields[name] = Number(constValue);
                }
            } else {
                if (options) {
                    fields.push({ name, type: 'e', options });
                } else {
                    fields.push({ name, type: type as ZoonSchemaFieldType });
                }
            }
        }
    }

    const data: DataRow[] = [];

    const autoIncCounters: Record<string, number> = {};

    for (const f of fields) {
        if (f.type === 'i+') autoIncCounters[f.name] = 0;
    }

    if (explicitRowCount > 0) {
        // Generate rows from count
        for (let i = 0; i < explicitRowCount; i++) {
            const row: DataRow = {};
            for (const f of fields) {
                if (f.type === 'i+') {
                    autoIncCounters[f.name]++;
                    row[f.name] = autoIncCounters[f.name];
                }
            }

            const unflattened = unflattenObject(row);
            // Inject constants
            const constantsUnflattened = unflattenObject(constantFields);
            // Deep merge constants
            const merge = (target: any, source: any) => {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            };
            merge(unflattened, constantsUnflattened);
            data.push(unflattened);
        }
    } else {
        // Parse body lines
        for (let i = 1; i < lines.length; i++) {
            const lineRaw = lines[i];
            if (!lineRaw) continue;
            const line = lineRaw.trim();
            if (!line) continue;

            const tokens = line.split(' ');
            const row: DataRow = {};
            let tokenIdx = 0;

            for (let j = 0; j < fields.length; j++) {
                const field = fields[j];
                if (!field) continue;

                if (field.type === 'i+') {
                    autoIncCounters[field.name]++;
                    row[field.name] = autoIncCounters[field.name];
                    continue;
                }

                const token = tokens[tokenIdx++];

                if (token === '~') {
                    row[field.name] = null;
                } else {
                    if (field.type === 'i') {
                        row[field.name] = Number(token);
                    } else if (field.type === 'b') {
                        row[field.name] = token === '1';
                    } else if (field.type === 'e' && field.options) {
                        row[field.name] = token ? token.replace(/_/g, ' ') : '';
                    } else if (field.type === 'a') {
                        const inner = token?.slice(1, -1) || '';
                        row[field.name] = inner ? inner.split(',').map((s) => s.replace(/_/g, ' ')) : [];
                    } else {
                        row[field.name] = token ? token.replace(/_/g, ' ') : '';
                    }
                }
            }

            const unflattened = unflattenObject(row);

            // Inject constants
            const constantsUnflattened = unflattenObject(constantFields);

            // Deep merge constants
            const merge = (target: any, source: any) => {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            };
            merge(unflattened, constantsUnflattened);

            data.push(unflattened);

        }
    }

    return data;
}

/**
 * ZOON - Zero Overhead Object Notation
 * 
 * A token-optimized text format designed to minimize token consumption
 * when transmitting structured data to Large Language Models (LLMs).
 * Achieves 40-60% token reduction compared to JSON.
 * 
 * @example
 * import { Zoon } from '@zoon-format/zoon'
 * 
 * const encoded = Zoon.encode([{ id: 1, name: 'Alice' }])
 * const decoded = Zoon.decode(encoded)
 */
export class Zoon {
    static encode = encode;
    static decode = decode;
    static inferSchema = inferSchema;
}


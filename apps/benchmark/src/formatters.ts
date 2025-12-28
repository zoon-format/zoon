import { encode as encodeZoon } from '@zoon-format/zoon'
import { encode as encodeToon } from '@toon-format/toon'
import { encode as encodeZon } from 'zon-format'

export type FormatName = 'json-pretty' | 'json-compact' | 'zoon' | 'toon' | 'zon' | 'csv'

export interface FormatResult {
    name: FormatName
    data: string
    bytes: number
}

export function formatJson(data: any, pretty: boolean = false): string {
    if (pretty) {
        return JSON.stringify(data, null, 2)
    }
    return JSON.stringify(data)
}

export function formatZoon(data: any): string {
    return encodeZoon(data)
}

export function formatToon(data: any): string {
    if (Array.isArray(data)) {
        return encodeToon(data)
    }
    return JSON.stringify(data)
}

export function formatZon(data: any): string {
    return encodeZon(data)
}

export function formatCsv(data: any): string {
    if (!Array.isArray(data) || data.length === 0) {
        return ''
    }

    const headers = Object.keys(data[0])
    const lines = [headers.join(',')]

    for (const row of data) {
        const values = headers.map(h => {
            const val = row[h]
            if (val === null || val === undefined) return ''
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                return `"${val.replace(/"/g, '""')}"`
            }
            return String(val)
        })
        lines.push(values.join(','))
    }

    return lines.join('\n')
}

export function formatAll(data: any): FormatResult[] {
    const results: FormatResult[] = []

    const jsonPretty = formatJson(data, true)
    results.push({ name: 'json-pretty', data: jsonPretty, bytes: Buffer.byteLength(jsonPretty) })

    const jsonCompact = formatJson(data, false)
    results.push({ name: 'json-compact', data: jsonCompact, bytes: Buffer.byteLength(jsonCompact) })

    const zoonStr = formatZoon(data)
    results.push({ name: 'zoon', data: zoonStr, bytes: Buffer.byteLength(zoonStr) })

    try {
        const toonStr = formatToon(data)
        results.push({ name: 'toon', data: toonStr, bytes: Buffer.byteLength(toonStr) })
    } catch {
        results.push({ name: 'toon', data: '', bytes: 0 })
    }

    try {
        const zonStr = formatZon(data)
        results.push({ name: 'zon', data: zonStr, bytes: Buffer.byteLength(zonStr) })
    } catch {
        results.push({ name: 'zon', data: '', bytes: 0 })
    }

    const csvStr = formatCsv(data)
    results.push({ name: 'csv', data: csvStr, bytes: Buffer.byteLength(csvStr) })

    return results
}

export const PRIMERS: Record<FormatName, string> = {
    'json-pretty': 'JSON: Standard JSON with indentation for readability.',
    'json-compact': 'JSON (compact): Standard JSON without extra whitespace.',
    'zoon': 'ZOON: Tabular format with header row defining schema. # starts header, values space-separated.',
    'toon': 'TOON: Indentation-based. Arrays declare length and fields. Rows use single delimiter.',
    'zon': 'ZON: Compact object notation with type inference and schema headers.',
    'csv': 'CSV: Comma-separated values with header row.'
}

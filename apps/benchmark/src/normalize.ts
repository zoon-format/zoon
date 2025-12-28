import type { AnswerType } from './questions'

export interface NormalizationOptions {
    tolerance?: number
    caseSensitive?: boolean
    allowCurrency?: boolean
    allowPercent?: boolean
    decimalPlaces?: number
}

const DEFAULT_OPTIONS: Required<NormalizationOptions> = {
    tolerance: 1e-6,
    caseSensitive: false,
    allowCurrency: true,
    allowPercent: true,
    decimalPlaces: 2
}

function stripQuotes(text: string): string {
    return text.trim().replace(/^["']|["']$/g, '')
}

function normalizeInteger(text: string, options: Required<NormalizationOptions>): number | null {
    const cleaned = text.replace(/[$€£¥,\s]/g, '')
    const match = cleaned.match(/-?\d+/)
    if (!match) return null
    const parsed = parseInt(match[0], 10)
    return isNaN(parsed) ? null : parsed
}

function normalizeNumber(text: string, options: Required<NormalizationOptions>): number | null {
    let cleaned = text.replace(/[$€£¥,\s]/g, '')
    const hasPercent = options.allowPercent && cleaned.endsWith('%')
    cleaned = cleaned.replace(/%/g, '')

    const match = cleaned.match(/-?\d+\.?\d*(?:e[+-]?\d+)?/i)
    if (!match) return null

    let parsed = parseFloat(match[0])
    if (isNaN(parsed)) return null

    if (hasPercent) parsed /= 100

    if (options.decimalPlaces !== undefined) {
        const factor = Math.pow(10, options.decimalPlaces)
        parsed = Math.round(parsed * factor) / factor
    }

    return parsed
}

function normalizeBoolean(text: string): boolean | null {
    const lower = text.trim().toLowerCase()
    if (['true', 'yes', 'y', '1'].includes(lower)) return true
    if (['false', 'no', 'n', '0'].includes(lower)) return false
    return null
}

function normalizeString(text: string, options: Required<NormalizationOptions>): string {
    let result = stripQuotes(text)
    result = result.replace(/```[\s\S]*?```/g, '')
    result = result.replace(/\*\*/g, '').replace(/_/g, ' ')
    result = result.trim()
    return options.caseSensitive ? result : result.toLowerCase()
}

function normalizeList(text: string, options: Required<NormalizationOptions>): string[] {
    const cleaned = stripQuotes(text)
    const items = cleaned.split(',').map(s => s.trim()).filter(s => s.length > 0)
    return items.map(item => options.caseSensitive ? item : item.toLowerCase())
}

export function normalizeAnswer(
    text: string,
    answerType: AnswerType,
    options: Partial<NormalizationOptions> = {}
): any {
    const opts: Required<NormalizationOptions> = { ...DEFAULT_OPTIONS, ...options }

    switch (answerType) {
        case 'integer':
            return normalizeInteger(text, opts)
        case 'number':
            return normalizeNumber(text, opts)
        case 'boolean':
            return normalizeBoolean(text)
        case 'string':
            return normalizeString(text, opts)
        case 'list':
            return normalizeList(text, opts)
        default:
            return text
    }
}

export function compareAnswers(
    actual: string,
    expected: string | number | boolean,
    answerType: AnswerType,
    options: Partial<NormalizationOptions> = {}
): { match: boolean; actualNormalized: any; expectedNormalized: any } {
    const opts: Required<NormalizationOptions> = { ...DEFAULT_OPTIONS, ...options }

    let actualNormalized: any
    let expectedNormalized: any

    switch (answerType) {
        case 'integer':
            actualNormalized = normalizeInteger(actual, opts)
            expectedNormalized = typeof expected === 'number' ? expected : normalizeInteger(String(expected), opts)
            return { match: actualNormalized === expectedNormalized, actualNormalized, expectedNormalized }

        case 'number':
            actualNormalized = normalizeNumber(actual, opts)
            expectedNormalized = typeof expected === 'number' ? expected : normalizeNumber(String(expected), opts)
            if (actualNormalized === null || expectedNormalized === null) {
                return { match: false, actualNormalized, expectedNormalized }
            }
            const diff = Math.abs(actualNormalized - expectedNormalized)
            return { match: diff < opts.tolerance || diff / Math.abs(expectedNormalized) < 0.01, actualNormalized, expectedNormalized }

        case 'boolean':
            actualNormalized = normalizeBoolean(actual)
            expectedNormalized = typeof expected === 'boolean' ? expected : normalizeBoolean(String(expected))
            return { match: actualNormalized === expectedNormalized, actualNormalized, expectedNormalized }

        case 'string':
            actualNormalized = normalizeString(actual, opts)
            expectedNormalized = normalizeString(String(expected), opts)
            return { match: actualNormalized === expectedNormalized, actualNormalized, expectedNormalized }

        case 'list':
            actualNormalized = normalizeList(actual, opts).sort()
            expectedNormalized = (Array.isArray(expected) ? expected : [expected]).map(s => String(s).toLowerCase()).sort()
            return {
                match: actualNormalized.length === expectedNormalized.length &&
                    actualNormalized.every((v: string, i: number) => v === expectedNormalized[i]),
                actualNormalized,
                expectedNormalized
            }

        default:
            return { match: actual === String(expected), actualNormalized: actual, expectedNormalized: expected }
    }
}

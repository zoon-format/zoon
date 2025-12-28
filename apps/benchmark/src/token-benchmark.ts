import { encodingForModel } from 'js-tiktoken'
import { generateEmployees, generateProducts, generateOrders, generateAnalytics, generateSensorReadings } from './datasets'
import { formatAll, type FormatName } from './formatters'

interface TokenResult {
    dataset: string
    records: number
    formats: Record<FormatName, { bytes: number; tokens: number }>
}

function countTokens(text: string, tokenizer: ReturnType<typeof encodingForModel>): number {
    return tokenizer.encode(text).length
}

function createBar(value: number, max: number, width: number = 30): string {
    const filled = Math.round((value / max) * width)
    return '█'.repeat(filled) + '░'.repeat(width - filled)
}

async function main() {
    console.log('='.repeat(80))
    console.log('  ZOON TOKEN EFFICIENCY BENCHMARK')
    console.log('  Tokenizer: GPT-5')
    console.log('='.repeat(80))
    console.log()

    const tokenizer = encodingForModel('gpt-5')

    const datasets = [
        { name: 'employees', data: generateEmployees(100), records: 100 },
        { name: 'products', data: generateProducts(50), records: 50 },
        { name: 'orders', data: generateOrders(75), records: 75 },
        { name: 'analytics', data: generateAnalytics(60), records: 60 },
        { name: 'sensors', data: generateSensorReadings(80), records: 80 }
    ]

    const results: TokenResult[] = []
    const totals: Record<FormatName, { bytes: number; tokens: number }> = {
        'json-pretty': { bytes: 0, tokens: 0 },
        'json-compact': { bytes: 0, tokens: 0 },
        'zoon': { bytes: 0, tokens: 0 },
        'toon': { bytes: 0, tokens: 0 },
        'zon': { bytes: 0, tokens: 0 },
        'csv': { bytes: 0, tokens: 0 }
    }

    for (const { name, data, records } of datasets) {
        console.log(`📊 Benchmarking: ${name} (${records} records)...`)

        const formatted = formatAll(data)
        const result: TokenResult = {
            dataset: name,
            records,
            formats: {} as Record<FormatName, { bytes: number; tokens: number }>
        }

        for (const fmt of formatted) {
            const tokens = fmt.data ? countTokens(fmt.data, tokenizer) : 0
            result.formats[fmt.name] = { bytes: fmt.bytes, tokens }
            totals[fmt.name].bytes += fmt.bytes
            totals[fmt.name].tokens += tokens
        }

        results.push(result)
    }

    console.log('\n' + '='.repeat(80))
    console.log('  RESULTS BY DATASET')
    console.log('='.repeat(80) + '\n')

    const header = `${'Dataset'.padEnd(15)} | ${'Records'.padStart(7)} | ${'JSON tk'.padStart(9)} | ${'ZOON tk'.padStart(9)} | ${'ZON tk'.padStart(9)} | ${'TOON tk'.padStart(9)} | ${'Savings'.padStart(8)}`
    console.log(header)
    console.log('-'.repeat(header.length))

    for (const result of results) {
        const jsonTk = result.formats['json-compact']?.tokens || 0
        const zoonTk = result.formats['zoon']?.tokens || 0
        const zonTk = result.formats['zon']?.tokens || 0
        const toonTk = result.formats['toon']?.tokens || 0
        const savings = jsonTk > 0 ? ((1 - zoonTk / jsonTk) * 100).toFixed(1) : '0.0'

        console.log(
            `${result.dataset.padEnd(15)} | ${String(result.records).padStart(7)} | ${String(jsonTk).padStart(9)} | ${String(zoonTk).padStart(9)} | ${String(zonTk).padStart(9)} | ${String(toonTk).padStart(9)} | ${(savings + '%').padStart(8)}`
        )
    }

    console.log('\n' + '='.repeat(80))
    console.log('  OVERALL SUMMARY')
    console.log('='.repeat(80) + '\n')

    const sortedFormats = Object.entries(totals)
        .filter(([name]) => !name.includes('pretty') && !name.includes('csv'))
        .sort((a, b) => a[1].tokens - b[1].tokens)

    const maxTokens = Math.max(...sortedFormats.map(([, v]) => v.tokens))
    const zoonTokens = totals['zoon'].tokens
    const jsonTokens = totals['json-compact'].tokens

    console.log('Token counts (GPT-5):\n')
    for (const [name, { tokens }] of sortedFormats) {
        const bar = createBar(tokens, maxTokens)
        const isWinner = tokens === Math.min(...sortedFormats.map(([, v]) => v.tokens))
        const crown = isWinner ? ' 👑' : ''
        const diffPct = tokens === zoonTokens ? '' : ` (+${((tokens - zoonTokens) / zoonTokens * 100).toFixed(1)}%)`
        console.log(`  ${name.padEnd(15)} ${bar} ${tokens.toLocaleString()} tokens${crown}${diffPct}`)
    }

    console.log('\n' + '─'.repeat(60))
    const reduction = ((1 - zoonTokens / jsonTokens) * 100).toFixed(1)
    console.log(`\n🏆 ZOON achieves ${reduction}% token reduction vs JSON compact`)
    console.log(`   Total ZOON tokens: ${zoonTokens.toLocaleString()}`)
    console.log(`   Total JSON tokens: ${jsonTokens.toLocaleString()}`)

    const markdown = generateMarkdownReport(results, totals)
    await Bun.write('results/token-efficiency.md', markdown)
    console.log('\n📝 Report saved to: results/token-efficiency.md')
}

function generateMarkdownReport(
    results: TokenResult[],
    totals: Record<FormatName, { bytes: number; tokens: number }>
): string {
    let md = `# Token Efficiency Benchmark

> Generated: ${new Date().toISOString()}
> Tokenizer: GPT-5

## Results by Dataset

| Dataset | Records | JSON tk | ZOON tk | ZON tk | TOON tk | Savings |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
`

    for (const result of results) {
        const jsonTk = result.formats['json-compact']?.tokens || 0
        const zoonTk = result.formats['zoon']?.tokens || 0
        const zonTk = result.formats['zon']?.tokens || 0
        const toonTk = result.formats['toon']?.tokens || 0
        const savings = jsonTk > 0 ? ((1 - zoonTk / jsonTk) * 100).toFixed(1) : '0.0'

        md += `| ${result.dataset} | ${result.records} | ${jsonTk} | ${zoonTk} | ${zonTk} | ${toonTk} | **${savings}%** |\n`
    }

    const zoonTotal = totals['zoon'].tokens
    const jsonTotal = totals['json-compact'].tokens
    const reduction = ((1 - zoonTotal / jsonTotal) * 100).toFixed(1)

    md += `

## Summary

- **Total JSON (compact) tokens**: ${jsonTotal.toLocaleString()}
- **Total ZOON tokens**: ${zoonTotal.toLocaleString()}
- **Overall reduction**: **${reduction}%**

### Token Comparison

| Format | Tokens | vs ZOON |
| :--- | ---: | ---: |
`

    const sortedFormats = Object.entries(totals)
        .filter(([name]) => !name.includes('pretty') && !name.includes('csv'))
        .sort((a, b) => a[1].tokens - b[1].tokens)

    for (const [name, { tokens }] of sortedFormats) {
        const diff = tokens === zoonTotal ? '—' : `+${((tokens - zoonTotal) / zoonTotal * 100).toFixed(1)}%`
        const crown = tokens === Math.min(...sortedFormats.map(([, v]) => v.tokens)) ? ' 👑' : ''
        md += `| ${name}${crown} | ${tokens.toLocaleString()} | ${diff} |\n`
    }

    return md
}

main().catch(console.error)

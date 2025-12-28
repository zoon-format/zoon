import { generateEmployees, generateProducts, generateOrders, generateAnalytics, generateSensorReadings } from './datasets'
import { generateQuestions, type Question } from './questions'
import { formatZoon, formatJson, formatToon, formatZon, type FormatName } from './formatters'
import { compareAnswers } from './normalize'
import { encodingForModel } from 'js-tiktoken'
import OpenAI from 'openai'

const FORMATS_TO_TEST: FormatName[] = ['json-compact', 'zoon', 'zon', 'toon']

const client = new OpenAI({
    baseURL: 'https://api.x.ai/v1',
    apiKey: process.env.XAI_API_KEY
})

const MODEL = 'grok-4-1-fast-reasoning'

async function evaluateBatch(
    questions: Question[],
    formattedData: string,
    formatName: FormatName
): Promise<{ questionId: string; actual: string; isCorrect: boolean }[]> {
    const questionList = questions.map((q, i) => `Q${i + 1}: ${q.prompt}`).join('\n')

    const prompt = `You are given data in ${formatName} format. Answer ALL questions below with ONLY the value, one answer per line, in order (A1, A2, etc).

DATA:
\`\`\`
${formattedData}
\`\`\`

QUESTIONS:
${questionList}

RULES:
- One answer per line, format: A1: value
- Numbers: digits only, no commas/symbols
- Yes/no questions: answer "yes" or "no"
- Be exact with names/strings from the data

ANSWERS:`

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0
        })

        const responseText = response.choices[0]?.message?.content || ''
        const lines = responseText.trim().split('\n')

        const results = questions.map((q, i) => {
            const line = lines.find(l => l.startsWith(`A${i + 1}:`)) || lines[i] || ''
            const actual = line.replace(/^A\d+:\s*/, '').trim()
            const comparison = compareAnswers(actual, q.groundTruth, q.answerType)
            return { questionId: q.id, actual, isCorrect: comparison.match }
        })

        return results
    } catch (error) {
        console.error('Batch evaluation error:', error)
        return questions.map(q => ({ questionId: q.id, actual: 'ERROR', isCorrect: false }))
    }
}

async function main() {
    console.log('='.repeat(80))
    console.log('  ZOON RETRIEVAL ACCURACY BENCHMARK (Batched)')
    console.log('  Model: grok-4-1-fast-reasoning (xAI)')
    console.log('='.repeat(80))
    console.log()

    const tokenizer = encodingForModel('gpt-5')

    const employees = generateEmployees(100)
    const products = generateProducts(50)
    const orders = generateOrders(75)
    const analytics = generateAnalytics(60)
    const sensors = generateSensorReadings(80)

    const questions = generateQuestions({ employees, products, orders, analytics, sensors })
    console.log(`📋 Generated ${questions.length} questions across 5 datasets\n`)

    const dataSets: Record<string, any[]> = { employees, products, orders, analytics, sensors }

    const formatFunctions: Record<FormatName, (data: any) => string> = {
        'json-compact': (d) => formatJson(d, false),
        'json-pretty': (d) => formatJson(d, true),
        'zoon': formatZoon,
        'zon': formatZon,
        'toon': formatToon,
        'csv': () => ''
    }

    const allResults: Record<FormatName, { questionId: string; isCorrect: boolean }[]> = {
        'json-compact': [], 'zoon': [], 'zon': [], 'toon': [], 'json-pretty': [], 'csv': []
    }

    for (const format of FORMATS_TO_TEST) {
        console.log(`\n🧪 Testing ${format.toUpperCase()}...`)

        const questionsPerDataset: Record<string, Question[]> = {}
        for (const q of questions) {
            if (!questionsPerDataset[q.dataset]) questionsPerDataset[q.dataset] = []
            questionsPerDataset[q.dataset]?.push(q)
        }

        for (const [datasetName, datasetQuestions] of Object.entries(questionsPerDataset)) {
            const data = dataSets[datasetName]
            let formattedData: string

            try {
                formattedData = formatFunctions[format](data)
            } catch {
                console.log(`  ⚠️ Could not format ${datasetName} as ${format}`)
                continue
            }

            const tokens = tokenizer.encode(formattedData).length
            console.log(`  📊 ${datasetName}: ${datasetQuestions.length} Qs, ${tokens} tokens`)

            const results = await evaluateBatch(datasetQuestions, formattedData, format)
            allResults[format].push(...results)

            const correct = results.filter(r => r.isCorrect).length
            console.log(`     ✅ ${correct}/${results.length} correct`)

            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    console.log('\n' + '='.repeat(80))
    console.log('  RESULTS SUMMARY')
    console.log('='.repeat(80) + '\n')

    const summaryTable: any[] = []

    for (const format of FORMATS_TO_TEST) {
        const results = allResults[format]
        if (results.length === 0) continue

        const correct = results.filter(r => r.isCorrect).length
        const accuracy = (correct / results.length) * 100
        const formattedData = formatFunctions[format](employees)
        const tokens = tokenizer.encode(formattedData).length

        summaryTable.push({
            Format: format.toUpperCase(),
            Tokens: tokens,
            Accuracy: `${accuracy.toFixed(1)}%`,
            Correct: `${correct}/${results.length}`,
            Efficiency: Math.round((accuracy / 100) * (15000 / tokens) * 100)
        })
    }

    console.table(summaryTable)

    const winner = summaryTable.reduce((a, b) => a.Efficiency > b.Efficiency ? a : b)
    console.log(`\n🏆 Best efficiency: ${winner.Format}`)

    const report = generateReport(summaryTable, allResults)
    await Bun.write('results/retrieval-accuracy.md', report)
    console.log('\n📝 Report saved to: results/retrieval-accuracy.md')
}

function generateReport(summary: any[], allResults: Record<FormatName, { questionId: string; isCorrect: boolean }[]>): string {
    let md = `# Retrieval Accuracy Benchmark

> Generated: ${new Date().toISOString()}
> Model: grok-4-1-fast-reasoning (xAI)

## Summary

| Format | Tokens | Accuracy | Correct | Efficiency |
| :--- | ---: | ---: | ---: | ---: |
`
    for (const row of summary) {
        md += `| ${row.Format} | ${row.Tokens} | ${row.Accuracy} | ${row.Correct} | ${row.Efficiency} |\n`
    }

    const winner = summary.reduce((a: any, b: any) => a.Efficiency > b.Efficiency ? a : b)
    md += `\n## Winner: ${winner.Format} 🏆\n`

    return md
}

main().catch(console.error)

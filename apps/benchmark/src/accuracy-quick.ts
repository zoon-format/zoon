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
const VERSION = '1.0.0'

interface DatasetConfig {
    name: string
    count: number
    generator: (count: number) => any[]
}

const DATASETS: DatasetConfig[] = [
    { name: 'employees', count: 30, generator: generateEmployees },
    { name: 'products', count: 25, generator: generateProducts },
    { name: 'orders', count: 20, generator: generateOrders },
]

interface FormatResult {
    format: FormatName
    tokens: number
    correct: number
    total: number
    accuracy: number
    efficiency: number
}

async function evaluateBatch(
    questions: Question[],
    formattedData: string,
    formatName: FormatName
): Promise<{ questionId: string; actual: string; expected: string; isCorrect: boolean }[]> {
    const questionList = questions.map((q, i) => `Q${i + 1}: ${q.prompt}`).join('\n')

    const prompt = `Given data in ${formatName} format, answer ALL questions. One answer per line (A1: value, A2: value, etc).

DATA:
\`\`\`
${formattedData}
\`\`\`

QUESTIONS:
${questionList}

ANSWERS:`

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
            temperature: 0
        })

        const responseText = response.choices[0]?.message?.content || ''
        const lines = responseText.trim().split('\n')

        return questions.map((q, i) => {
            const line = lines.find(l => l.startsWith(`A${i + 1}:`)) || lines[i] || ''
            const actual = line.replace(/^A\d+:\s*/, '').trim()
            const comparison = compareAnswers(actual, q.groundTruth, q.answerType)
            return { questionId: q.id, actual, expected: q.groundTruth, isCorrect: comparison.match }
        })
    } catch (error) {
        console.error('API Error:', error)
        return questions.map(q => ({ questionId: q.id, actual: 'ERROR', expected: q.groundTruth, isCorrect: false }))
    }
}

function printTable(results: FormatResult[]) {
    const sorted = [...results].sort((a, b) => b.efficiency - a.efficiency)

    console.log('\n+----------------+---------+----------+-------------+------------+')
    console.log('| Format         | Tokens  | Accuracy | Correct     | Efficiency |')
    console.log('+----------------+---------+----------+-------------+------------+')

    sorted.forEach((r, i) => {
        const icon = i === 0 ? '*' : ' '
        const format = r.format.toUpperCase().padEnd(12)
        const tokens = r.tokens.toString().padStart(5)
        const accuracy = `${r.accuracy.toFixed(1)}%`.padStart(6)
        const correct = `${r.correct}/${r.total}`.padStart(9)
        const efficiency = r.efficiency.toFixed(2).padStart(8)
        console.log(`| ${icon} ${format} | ${tokens}   | ${accuracy}   | ${correct}   | ${efficiency}   |`)
    })

    console.log('+----------------+---------+----------+-------------+------------+')
}

function printSummary(results: FormatResult[], startTime: number) {
    const winner = results.reduce((a, b) => a.efficiency > b.efficiency ? a : b)
    const json = results.find(r => r.format === 'json-compact')!
    const zoon = results.find(r => r.format === 'zoon')!
    const zon = results.find(r => r.format === 'zon')
    const toon = results.find(r => r.format === 'toon')

    const tokenSavingsVsJson = ((1 - zoon.tokens / json.tokens) * 100).toFixed(1)
    const tokenSavingsVsZon = zon ? ((1 - zoon.tokens / zon.tokens) * 100).toFixed(1) : 'N/A'
    const tokenSavingsVsToon = toon ? ((1 - zoon.tokens / toon.tokens) * 100).toFixed(1) : 'N/A'
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('\n[Summary]')
    console.log('-'.repeat(50))
    console.log(`Winner:                ${winner.format.toUpperCase()}`)
    console.log(`ZOON vs JSON:          ${tokenSavingsVsJson}% fewer tokens`)
    console.log(`ZOON vs ZON:           ${tokenSavingsVsZon}% fewer tokens`)
    console.log(`ZOON vs TOON:          ${tokenSavingsVsToon}% fewer tokens`)
    console.log('-'.repeat(50))
    console.log(`ZOON Tokens:           ${zoon.tokens}`)
    console.log(`JSON Tokens:           ${json.tokens}`)
    console.log(`Duration:              ${duration}s`)
    console.log(`Model:                 ${MODEL}`)
}

async function main() {
    const startTime = Date.now()

    console.log('='.repeat(60))
    console.log('  ZOON Accuracy Benchmark v' + VERSION)
    console.log('='.repeat(60))
    console.log(`\nDate: ${new Date().toISOString()}`)
    console.log(`Model: ${MODEL}`)
    console.log(`Datasets: ${DATASETS.map(d => `${d.name}(${d.count})`).join(', ')}\n`)

    const tokenizer = encodingForModel('gpt-4')

    const dataSets: Record<string, any[]> = {}
    let totalRows = 0
    for (const ds of DATASETS) {
        dataSets[ds.name] = ds.generator(ds.count)
        totalRows += ds.count
    }

    console.log(`Total rows: ${totalRows}`)

    const questions = generateQuestions({
        employees: dataSets.employees || generateEmployees(1),
        products: dataSets.products || generateProducts(1),
        orders: dataSets.orders || generateOrders(1),
        analytics: generateAnalytics(1),
        sensors: generateSensorReadings(1)
    }).filter(q => DATASETS.some(d => d.name === q.dataset))

    console.log(`Questions: ${questions.length}\n`)

    const formatFunctions: Record<FormatName, (data: any) => string> = {
        'json-compact': (d) => formatJson(d, false),
        'json-pretty': (d) => formatJson(d, true),
        'zoon': formatZoon,
        'zon': formatZon,
        'toon': formatToon,
        'csv': () => ''
    }

    const results: FormatResult[] = []

    for (const format of FORMATS_TO_TEST) {
        process.stdout.write(`Testing ${format.toUpperCase().padEnd(12)} `)
        let totalCorrect = 0
        let totalQuestions = 0
        let totalTokens = 0

        for (const [datasetName, data] of Object.entries(dataSets)) {
            const datasetQuestions = questions.filter(q => q.dataset === datasetName)
            if (datasetQuestions.length === 0) continue

            const formattedData = formatFunctions[format](data)
            totalTokens += tokenizer.encode(formattedData).length

            const batchResults = await evaluateBatch(datasetQuestions, formattedData, format)
            const correct = batchResults.filter(r => r.isCorrect).length
            totalCorrect += correct
            totalQuestions += datasetQuestions.length
        }

        const accuracy = (totalCorrect / totalQuestions) * 100
        const efficiency = accuracy / totalTokens * 100

        results.push({
            format,
            tokens: totalTokens,
            correct: totalCorrect,
            total: totalQuestions,
            accuracy,
            efficiency
        })

        console.log(`${totalCorrect}/${totalQuestions} (${accuracy.toFixed(0)}%) | ${totalTokens} tokens`)
    }

    printTable(results)
    printSummary(results, startTime)

    console.log('\n' + '═'.repeat(60))
}

main().catch(console.error)

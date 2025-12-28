import OpenAI from 'openai'
import type { Question } from './questions'
import type { FormatName } from './formatters'
import { PRIMERS } from './formatters'
import { compareAnswers } from './normalize'

export interface EvaluationResult {
    questionId: string
    format: FormatName
    model: string
    expected: string | number | boolean
    actual: string
    isCorrect: boolean
    inputTokens: number
    outputTokens: number
    latencyMs: number
}

const client = new OpenAI({
    baseURL: 'https://api.x.ai/v1',
    apiKey: process.env.XAI_API_KEY
})

const MODEL = 'grok-4-1-fast-reasoning'

export async function evaluateQuestion(
    question: Question,
    formatName: FormatName,
    formattedData: string
): Promise<EvaluationResult> {
    const primer = PRIMERS[formatName] || ''

    const prompt = `${primer}

Given the following data in ${formatName} format:

\`\`\`
${formattedData}
\`\`\`

Question: ${question.prompt}

Answer format requirements:
- Provide only the value itself, no explanation
- For numbers: output digits only (no commas, currency symbols, or units)
- For dates/field names: use the exact string from the data
- For yes/no questions: answer only "yes" or "no"

Answer:`

    const startTime = performance.now()

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0
    })

    const latencyMs = performance.now() - startTime
    const actual = response.choices[0]?.message?.content?.trim() || ''

    const comparison = compareAnswers(actual, question.groundTruth, question.answerType)

    return {
        questionId: question.id,
        format: formatName,
        model: MODEL,
        expected: question.groundTruth,
        actual,
        isCorrect: comparison.match,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        latencyMs
    }
}

export async function evaluateDataset(
    questions: Question[],
    formatName: FormatName,
    formattedData: string,
    onProgress?: (completed: number, total: number) => void
): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = []

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        try {
            const result = await evaluateQuestion(question!, formatName, formattedData)
            results.push(result)
        } catch (error) {
            console.error(`Error evaluating ${question!.id}:`, error)
            results.push({
                questionId: question!.id,
                format: formatName,
                model: MODEL,
                expected: question!.groundTruth,
                actual: 'ERROR',
                isCorrect: false,
                inputTokens: 0,
                outputTokens: 0,
                latencyMs: 0
            })
        }

        if (onProgress) {
            onProgress(i + 1, questions.length)
        }

        await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
}

export function summarizeResults(results: EvaluationResult[]): {
    total: number
    correct: number
    accuracy: number
    avgLatency: number
    totalInputTokens: number
    totalOutputTokens: number
} {
    const correct = results.filter(r => r.isCorrect).length
    const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length
    const totalInputTokens = results.reduce((sum, r) => sum + r.inputTokens, 0)
    const totalOutputTokens = results.reduce((sum, r) => sum + r.outputTokens, 0)

    return {
        total: results.length,
        correct,
        accuracy: (correct / results.length) * 100,
        avgLatency,
        totalInputTokens,
        totalOutputTokens
    }
}

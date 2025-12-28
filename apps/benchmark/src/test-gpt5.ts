import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
    console.log('Testing GPT-5 API...');

    const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
            { role: 'user', content: 'What is 2+2? Answer with just the number.' }
        ],
        max_completion_tokens: 50
    });

    console.log('Full response:');
    console.log(JSON.stringify(response, null, 2));
    console.log('\nContent:', response.choices[0]?.message?.content);
}

test().catch(console.error);

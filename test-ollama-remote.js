const axios = require('axios');

// Konfiguration
const OLLAMA_URL = 'https://ollama.ai.udg.de';
const MODEL = 'qwen3-vl:8b';

// Test Image (Base64 Pixel)
const TEST_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKw3qAAAAABJRU5ErkJggg==";

async function testOllama() {
    console.log(`🔍 Testing Ollama connection to ${OLLAMA_URL} with model ${MODEL}...`);

    try {
        // 1. Tags Check
        console.log('1️⃣ Checking available models...');
        const tagsResponse = await axios.get(`${OLLAMA_URL}/api/tags`);
        const models = tagsResponse.data.models || [];
        const modelExists = models.some(m => m.name === MODEL || m.model === MODEL);

        if (modelExists) {
            console.log(`✅ Model ${MODEL} found.`);
        } else {
            console.warn(`⚠️ Model ${MODEL} not found in listing! Available: ${models.map(m => m.name).join(', ')}`);
        }

        // 2. Chat Analysis Request
        console.log('2️⃣ Sending Image Analysis Request...');
        const startTime = Date.now();

        const response = await axios.post(
            `${OLLAMA_URL}/api/chat`,
            {
                model: MODEL,
                messages: [
                    {
                        role: 'user',
                        content: 'Was ist das für eine Farbe? Antworte sehr kurz.',
                        images: [TEST_IMAGE_BASE64]
                    }
                ],
                stream: false
            },
            { timeout: 30000 }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`✅ Response received in ${duration}s:`);
        console.log('---------------------------------------------------');
        console.log(response.data.message?.content);
        console.log('---------------------------------------------------');

    } catch (error) {
        console.error('❌ Error during test:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testOllama();

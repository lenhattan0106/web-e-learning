const fs = require('fs');
const path = require('path');

// Simple .env parser since we might not have dotenv installed
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, ''); // remove quotes
                    if (key && value && !process.env[key]) {
                        process.env[key] = value;
                    }
                }
            });
            console.log("Loaded .env file");
        } else {
            console.warn("No .env file found at:", envPath);
        }
    } catch (e) {
        console.error("Error loading .env:", e);
    }
}

async function listModels() {
    loadEnv();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        console.error("ERROR: GOOGLE_GENERATIVE_AI_API_KEY not found in environment variables.");
        return;
    }

    console.log("Checking available models with API Key ending in...", apiKey.slice(-4));
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", JSON.stringify(data.error, null, 2));
        } else if (data.models) {
            console.log("\nAvailable Models:");
            data.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name}`);
                    console.log(`  Supported methods: ${JSON.stringify(m.supportedGenerationMethods)}`);
                }
            });
        } else {
            console.log("Unexpected response format:", data);
        }

    } catch (error) {
        console.error("Network or script error:", error);
    }
}

listModels();

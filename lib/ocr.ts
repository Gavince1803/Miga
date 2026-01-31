import * as FileSystem from 'expo-file-system/legacy';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
// Using safe model alias
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Performs OCR and extraction on an image using Google Gemini API
 * @param imageUri - Local URI of the image (from camera or gallery)
 * @returns Extracted JSON string or null
 */
export async function extractTextFromImage(imageUri: string): Promise<string | null> {
    try {
        if (!GEMINI_API_KEY) {
            console.error('Gemini API Key is missing. Check .env');
            throw new Error('API Key configuration error');
        }

        const base64Image = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
        });

        const prompt = `
            Analyze this recipe image. Extract the data into a strict JSON object.
            
            Return ONLY valid JSON. No markdown formatting (no \`\`\`json).
            
            Structure:
            {
              "title": "Recipe Title",
              "ingredients": ["1 cup flour", "2 eggs"],
              "steps": ["Mix ingredients", "Bake at 350F"]
            }

            If it is clearly NOT a recipe, return { "error": "INVALID_IMAGE" }
        `;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                ]
            }]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!extractedText) return null;

        // Clean any potential markdown fencing just in case
        return extractedText.replace(/```json/g, '').replace(/```/g, '').trim();

    } catch (error: any) {
        console.error('Error processing recipe with Gemini:', error);
        return null;
    }
}

/**
 * Parses the structured text (JSON string) returned by Gemini
 */
export function parseRecipeText(jsonString: string): {
    ingredients: string[];
    steps: string[];
    title?: string;
} {
    try {
        const match = jsonString.match(/\{[\s\S]*\}/);
        const cleanJson = match ? match[0] : jsonString;

        const parsed = JSON.parse(cleanJson);

        if (parsed.error === 'INVALID_IMAGE') {
            return { ingredients: [], steps: [], title: undefined };
        }

        return {
            ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
            steps: Array.isArray(parsed.steps) ? parsed.steps : [],
            title: parsed.title || undefined
        };
    } catch (e) {
        console.error('Failed to parse OCR JSON:', e);
        return { ingredients: [], steps: [], title: undefined };
    }
}

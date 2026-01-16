// @ts-ignore
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

/**
 * Performs OCR on an image using Google Cloud Vision via Supabase Edge Function
 * @param imageUri - Local URI of the image (from camera or gallery)
 * @returns Extracted text or null if failed
 */
export async function extractTextFromImage(imageUri: string): Promise<string | null> {
    try {
        // Read image as base64
        const base64Image = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
        });

        // Get current session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.error('No session for OCR request');
            return null;
        }


        // Force a session refresh to ensure token is valid
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) console.log('OCR Refresh Error:', refreshError.message);

        const access_token = refreshData.session?.access_token;

        console.log('OCR Session Check:', access_token ? 'Session active' : 'No active session');
        if (!access_token) {
            console.warn('OCR Warning: No valid session. Request will likely fail.');
        } else {
            console.log('OCR Token refreshed.');
        }

        console.log(`Sending OCR request to 'ocr-recipe'. Image size: ${base64Image.length} chars (~${Math.round(base64Image.length * 0.75 / 1024)} KB)`);

        // Call our Supabase Edge Function
        // Explicitly passing Authorization header to ensure it's sent
        const { data, error } = await supabase.functions.invoke('ocr-recipe', {
            body: { imageBase64: base64Image },
            headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
        });

        if (error) {
            console.error('OCR function error object:', error);
            console.error('OCR function error status:', (error as any).status);
            console.error('OCR function error message:', (error as any).message);
            // If the error is a FunctionsHttpError, it might have a context
            if ((error as any).context) console.error('OCR Error Context:', JSON.stringify((error as any).context));

            return null;
        }

        if (data?.success && data?.text) {
            return data.text;
        }

        console.error('OCR returned no text:', data);
        return null;

    } catch (error: any) {
        console.error('Error extracting text from image:', error);
        if (error.context) console.error('Error Context:', JSON.stringify(error.context));
        return null;
    }
}

/**
 * Parses extracted recipe text into structured ingredients and steps
 * This is a simple heuristic parser - can be improved with AI later
 */
export function parseRecipeText(text: string): {
    ingredients: string[];
    steps: string[];
    title?: string;
} {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const ingredients: string[] = [];
    const steps: string[] = [];
    let title: string | undefined;

    let inStepsSection = false;

    for (const line of lines) {
        // Detect section headers
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('ingredientes') || lowerLine.includes('ingredients')) {
            inStepsSection = false;
            continue;
        }
        if (lowerLine.includes('pasos') || lowerLine.includes('preparación') ||
            lowerLine.includes('instrucciones') || lowerLine.includes('steps')) {
            inStepsSection = true;
            continue;
        }

        // Detect numbered steps (1. 2. 3. or 1) 2) 3))
        const isNumberedStep = /^[\d]+[.\)]\s/.test(line);

        // Detect bullet points or dashes (common for ingredients)
        const isBulletPoint = /^[-•*]\s/.test(line);

        // Detect quantities (common patterns for ingredients)
        const hasQuantity = /\d+\s*(g|kg|ml|l|u|oz|taza|cucharada|cdta|cda)/i.test(line);

        if (isNumberedStep || inStepsSection) {
            // Remove leading number/bullet
            const cleanStep = line.replace(/^[\d]+[.\)]\s*/, '').replace(/^[-•*]\s*/, '');
            if (cleanStep.length > 5) { // Avoid very short lines
                steps.push(cleanStep);
            }
        } else if (isBulletPoint || hasQuantity || (!inStepsSection && lines.indexOf(line) > 0)) {
            // Likely an ingredient
            const cleanIngredient = line.replace(/^[-•*]\s*/, '');
            if (cleanIngredient.length > 2) {
                ingredients.push(cleanIngredient);
            }
        } else if (!title && lines.indexOf(line) === 0 && line.length < 50) {
            // First short line might be title
            title = line;
        }
    }

    return { ingredients, steps, title };
}

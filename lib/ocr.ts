import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

/**
 * Performs OCR and extraction on an image with Gemini, through the
 * scan-recipe Edge Function (which holds the API key)
 * @param imageUri - Local URI of the image (from camera or gallery)
 * @param inventoryItems - Optional list of inventory items to match against
 * @returns Extracted JSON string or null
 */
export async function extractTextFromImage(
    imageUri: string,
    inventoryItems: { id: string, name: string, unit: string }[] = []
): Promise<string | null> {
    try {
        const base64Image = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
        });

        const { data, error } = await supabase.functions.invoke('scan-recipe', {
            body: { image: base64Image, inventoryItems },
        });

        if (error) {
            console.error('scan-recipe error:', error);
            return null;
        }

        return data?.text ?? null;

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
    linkedIngredients: { inventoryId: string; quantity: number; unit: string; originalName?: string }[];
    steps: string[];
    title?: string;
} {
    try {
        const match = jsonString.match(/\{[\s\S]*\}/);
        const cleanJson = match ? match[0] : jsonString;

        const parsed = JSON.parse(cleanJson);

        if (parsed.error === 'INVALID_IMAGE') {
            return { ingredients: [], linkedIngredients: [], steps: [], title: undefined };
        }

        return {
            ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
            linkedIngredients: Array.isArray(parsed.linkedIngredients) ? parsed.linkedIngredients : [],
            steps: Array.isArray(parsed.steps) ? parsed.steps : [],
            title: parsed.title || undefined
        };
    } catch (e) {
        console.error('Failed to parse OCR JSON:', e);
        return { ingredients: [], linkedIngredients: [], steps: [], title: undefined };
    }
}

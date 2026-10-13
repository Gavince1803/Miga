// Turns a recipe photo into structured JSON with Gemini. The API key only
// lives here (GEMINI_API_KEY secret): the app used to ship it in its bundle,
// where anyone could extract it.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// Flash sometimes answers 503 (overloaded) for minutes at a time; Flash-Lite is the fallback
const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const apiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// The app sends a ~600px JPEG at 0.5 quality (well under 1 MB of base64)
const MAX_IMAGE_CHARS = 4_000_000;
const MAX_INVENTORY_ITEMS = 500;

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type InventoryItem = { id: string; name: string; unit: string };

function buildPrompt(inventoryItems: InventoryItem[]) {
    const inventoryContext = inventoryItems.length > 0
        ? `
            I have an inventory with the following items (ID: Name [Unit]):
            ${JSON.stringify(inventoryItems.map(i => `${i.id}: ${i.name} [${i.unit}]`))}

            For each ingredient found in the image:
            1. Try to find a matching item in my inventory (fuzzy match).
            2. If a match is HIGHLY LIKELY, include it in the "linkedIngredients" array with the Inventory ID, and standard quantity/unit.
            3. If NO match is found, ALSO include it in "linkedIngredients" but set "inventoryId" to "new:" followed by the ingredient name (e.g. "new:Cardamom"). Estimate the quantity and unit.
            4. Only use the plain "ingredients" array for items that are not ingredients (like headers) or if you really cannot structure it.
            `
        : '';

    return `
            Analyze this recipe image. Extract the data into a strict JSON object.

            ${inventoryContext}

            Return ONLY valid JSON. No markdown formatting (no \`\`\`json).

            Structure:
            {
              "title": "Recipe Title",
              "ingredients": ["Optional notes"],
              "linkedIngredients": [
                { "inventoryId": "uuid...", "quantity": 0.5, "unit": "kg", "originalName": "Harina" },
                { "inventoryId": "new:Cardamomo", "quantity": 10, "unit": "g", "originalName": "Cardamomo" }
              ],
              "steps": ["Mix ingredients", "Bake at 350F"]
            }

            If it is clearly NOT a recipe, return { "error": "INVALID_IMAGE" }
        `;
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (!GEMINI_API_KEY) return json({ error: 'Not configured' }, 500);

    // The gateway accepts the anon key too, so require an actual signed-in user
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let image: unknown, inventoryItems: unknown;
    try {
        ({ image, inventoryItems } = await req.json());
    } catch {
        return json({ error: 'Invalid body' }, 400);
    }
    if (typeof image !== 'string' || image.length === 0 || image.length > MAX_IMAGE_CHARS) {
        return json({ error: 'Invalid image' }, 400);
    }
    const items: InventoryItem[] = (Array.isArray(inventoryItems) ? inventoryItems : [])
        .slice(0, MAX_INVENTORY_ITEMS)
        .map((i: any) => ({ id: String(i?.id ?? ''), name: String(i?.name ?? '').slice(0, 100), unit: String(i?.unit ?? '').slice(0, 20) }));

    const body = JSON.stringify({
        contents: [{
            parts: [
                { text: buildPrompt(items) },
                { inline_data: { mime_type: 'image/jpeg', data: image } },
            ],
        }],
    });

    let response: Response | undefined;
    for (const model of MODELS) {
        response = await fetch(apiUrl(model), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
            body,
        });
        if (response.ok) break;
        console.error('Gemini API error:', model, response.status, await response.text());
        if (response.status !== 503 && response.status !== 429) break;
    }
    if (!response?.ok) return json({ error: 'Gemini error' }, 502);

    const data = await response.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json({ text: null });

    // Clean any potential markdown fencing just in case
    return json({ text: text.replace(/```json/g, '').replace(/```/g, '').trim() });
});

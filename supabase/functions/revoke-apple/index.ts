// Revokes a user's Sign in with Apple grant when they delete their account,
// as App Store guideline 5.1.1(v) requires. The app sends a fresh
// authorizationCode; we exchange it for a refresh token and revoke that.
// Secrets: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 contents).
import { importPKCS8, SignJWT } from 'npm:jose@5';

const TEAM_ID = Deno.env.get('APPLE_TEAM_ID');
const KEY_ID = Deno.env.get('APPLE_KEY_ID');
const PRIVATE_KEY = Deno.env.get('APPLE_PRIVATE_KEY');
const CLIENT_ID = 'com.agendarepostera.app';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function clientSecret() {
    const key = await importPKCS8(PRIVATE_KEY!, 'ES256');
    return new SignJWT({})
        .setProtectedHeader({ alg: 'ES256', kid: KEY_ID! })
        .setIssuer(TEAM_ID!)
        .setSubject(CLIENT_ID)
        .setAudience('https://appleid.apple.com')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(key);
}

const post = (path: string, params: Record<string, string>) =>
    fetch(`https://appleid.apple.com/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    });

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (!TEAM_ID || !KEY_ID || !PRIVATE_KEY) return json({ error: 'Not configured' }, 500);

    let authorizationCode: unknown;
    try {
        ({ authorizationCode } = await req.json());
    } catch {
        return json({ error: 'Invalid body' }, 400);
    }
    if (typeof authorizationCode !== 'string' || !authorizationCode) {
        return json({ error: 'Missing authorizationCode' }, 400);
    }

    const secret = await clientSecret();

    const tokenResponse = await post('token', {
        client_id: CLIENT_ID,
        client_secret: secret,
        code: authorizationCode,
        grant_type: 'authorization_code',
    });
    if (!tokenResponse.ok) {
        console.error('Apple token exchange failed:', tokenResponse.status, await tokenResponse.text());
        return json({ error: 'Token exchange failed' }, 502);
    }
    const tokens = await tokenResponse.json();
    const token = tokens.refresh_token ?? tokens.access_token;

    const revokeResponse = await post('revoke', {
        client_id: CLIENT_ID,
        client_secret: secret,
        token,
        token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    });
    if (!revokeResponse.ok) {
        console.error('Apple revoke failed:', revokeResponse.status, await revokeResponse.text());
        return json({ error: 'Revoke failed' }, 502);
    }

    return json({ revoked: true });
});

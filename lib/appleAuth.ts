import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Apple requires revoking the user's Sign in with Apple grant when they delete
 * their account (guideline 5.1.1(v)). The native flow never hands us a refresh
 * token to keep, so ask Apple for a fresh authorization code and let the
 * revoke-apple Edge Function exchange and revoke it.
 * Returns false only if the user cancelled the Apple prompt; a failed revoke
 * is logged but doesn't block the deletion.
 */
export async function revokeAppleSignIn(): Promise<boolean> {
    if (Platform.OS !== 'ios') return true;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.identities?.some(i => i.provider === 'apple')) return true;

    try {
        const { authorizationCode } = await AppleAuthentication.signInAsync();
        if (!authorizationCode) throw new Error('Apple did not return an authorizationCode');

        const { error } = await supabase.functions.invoke('revoke-apple', { body: { authorizationCode } });
        if (error) console.error('Apple revoke failed:', error);
    } catch (error: any) {
        if (error?.code === 'ERR_REQUEST_CANCELED') return false;
        console.error('Apple revoke failed:', error);
    }
    return true;
}

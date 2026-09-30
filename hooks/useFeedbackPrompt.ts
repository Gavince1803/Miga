import { supabase } from '@/lib/supabase';
import { useCallback } from 'react';

// Users with fewer orders don't have enough context to judge the app yet
const MIN_ORDERS_FOR_PROMPT = 5;

export function useFeedbackPrompt() {
    const shouldShowPrompt = useCallback(async (): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('feedback_prompt_shown')
                .eq('id', user.id)
                .single();
            if (error || !profile || profile.feedback_prompt_shown) return false;

            const { count } = await supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);
            return (count ?? 0) >= MIN_ORDERS_FOR_PROMPT;
        } catch (error) {
            console.error('Error checking feedback prompt:', error);
            return false;
        }
    }, []);

    // Called when the prompt is SHOWN, not answered: one interruption per user, ever
    const markPromptShown = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            .update({ feedback_prompt_shown: true })
            .eq('id', user.id);
        if (error) console.error('Error marking feedback prompt shown:', error);
    }, []);

    return { shouldShowPrompt, markPromptShown };
}

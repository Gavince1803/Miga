import { initializeRevenueCat } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
            if (session?.user) {
                initializeRevenueCat(session.user.id);
            }
        });

        // Initialize on mount if session exists
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                initializeRevenueCat(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

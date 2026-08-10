import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type VantiProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  balance: number;
  hide_following: boolean;
  suspended_until: string | null;
};

/** Current auth session, kept in sync with Supabase auth state. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data: current }) => {
      setSession(current.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

/** The signed-in user's profile row, including their live virtual balance. */
export function useProfile() {
  const { user } = useSession();
  const userId = user?.id;

  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<VantiProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, balance, hide_following, suspended_until")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, balance: Number(data.balance) };
    },
  });
}

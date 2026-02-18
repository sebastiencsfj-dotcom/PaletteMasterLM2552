import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
console.log("[SUPABASE DEBUG]", { url: supabaseUrl, keyLoaded: !!supabaseKey });

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const syncToRemote = async (data: any) => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('app_state')
      .upsert(
        {
          id: 1,
          payload: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Erreur sync Supabase:', e);
    return false;
  }
};

export const onRemoteUpdate = (callback: (data: any) => void) => {
  if (!supabase) return () => {};

  // Charger l'état initial
  supabase
    .from('app_state')
    .select('payload')
    .eq('id', 1)
    .single()
    .then(({ data }) => {
      if (data?.payload) callback(data.payload);
    });

  // Ecoute en temps réel
  const channel = supabase
    .channel('app_state_sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_state',
        filter: 'id=eq.1',
      },
      (payload) => {
        const row = payload.new as any;
        if (row?.payload) callback(row.payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const isSupabaseEnabled = () => !!supabase;
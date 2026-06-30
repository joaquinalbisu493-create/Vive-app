import { supabase } from '@/lib/supabase';

export async function getSemanasActivas(userId: string): Promise<number> {
  const { data } = await supabase
    .from('bookings')
    .select('scheduled_date')
    .eq('user_id', userId)
    .eq('status', 'completada');

  if (!data || data.length === 0) return 0;

  const weekSet = new Set(
    data.map(b => Math.floor(new Date(b.scheduled_date).getTime() / (7 * 24 * 60 * 60 * 1000)))
  );
  return weekSet.size;
}

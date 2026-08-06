import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { CreditCard } from 'lucide-react';

export default async function Credits() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('credits')
    .eq('id', user.id)
    .single();

  const credits = profile?.credits ?? 0;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <CreditCard className="text-primary" /> Meus CrÃ©ditos
      </h1>
      
      <div className="bg-panel p-8 rounded-xl border border-rule mb-8">
        <p className="text-sm opacity-70 uppercase tracking-wider font-bold mb-2">Saldo Atual</p>
        <p className="text-5xl font-light text-primary">ðŸ’Ž {credits}</p>
        <p className="text-sm opacity-50 mt-4">Os crÃ©ditos sÃ£o consumidos a cada geraÃ§Ã£o de IA finalizada.</p>
      </div>

      <div className="bg-panel p-8 rounded-xl border border-rule">
        <h3 className="font-bold text-lg mb-4">Adicionar mais crÃ©ditos</h3>
        <p className="opacity-70 mb-6">A recarga automÃ¡tica via cartÃ£o de crÃ©dito estarÃ¡ disponÃ­vel em breve. Caso precise de mais limite agora, entre em contato com o administrador.</p>
        <button disabled className="bg-primary/50 text-white font-bold py-3 px-8 rounded-lg cursor-not-allowed">
          Comprar CrÃ©ditos (Em Breve)
        </button>
      </div>
    </div>
  );
}


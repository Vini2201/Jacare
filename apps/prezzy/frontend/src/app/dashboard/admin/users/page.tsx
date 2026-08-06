import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Users as UsersIcon } from 'lucide-react';

export default async function AdminUsers() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // We only fetch profiles here (for security we don't query auth.users from client API)
  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <UsersIcon className="text-primary" /> UsuÃ¡rios
      </h1>
      
      <div className="bg-panel rounded-xl border border-rule overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-rule bg-panel-2/50 text-sm opacity-70">
              <th className="p-4 font-medium">ID (UUID)</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">CrÃ©ditos</th>
              <th className="p-4 font-medium">Registrado em</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map(u => (
              <tr key={u.id} className="border-b border-rule last:border-0 hover:bg-rule/30 transition-colors">
                <td className="p-4 text-xs font-mono opacity-70">{u.id}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === 'superuser' ? 'bg-primary/20 text-primary' : 'bg-slate-500/20 text-slate-500'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 font-medium text-primary">ðŸ’Ž {u.credits}</td>
                <td className="p-4 text-sm opacity-70">
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


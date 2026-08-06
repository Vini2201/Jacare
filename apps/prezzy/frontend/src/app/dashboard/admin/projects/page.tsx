import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Globe } from 'lucide-react';

export default async function AdminProjects() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('*, user_profiles(role, credits)')
    .order('created_at', { ascending: false })
    .limit(50);

  const statusMap: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-500',
    pending_approval: 'bg-yellow-500/10 text-yellow-500',
    generating: 'bg-blue-500/10 text-blue-500',
    completed: 'bg-green-500/10 text-green-500',
    failed: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Globe className="text-primary" /> Projetos Globais (VisÃ£o Admin)
      </h1>
      
      {!projects || projects.length === 0 ? (
        <div className="text-center p-12 bg-panel rounded-xl border border-rule">
          <p className="opacity-50">Nenhum projeto encontrado no sistema.</p>
        </div>
      ) : (
        <div className="bg-panel rounded-xl border border-rule overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-rule bg-panel-2/50 text-sm opacity-70">
                <th className="p-4 font-medium">ID (Projeto)</th>
                <th className="p-4 font-medium">TÃ­tulo</th>
                <th className="p-4 font-medium">UsuÃ¡rio ID</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-rule last:border-0 hover:bg-rule/30 transition-colors">
                  <td className="p-4 text-xs font-mono opacity-70 truncate max-w-[100px]">{p.id}</td>
                  <td className="p-4 font-bold">{p.title}</td>
                  <td className="p-4 text-xs font-mono opacity-70 truncate max-w-[100px]" title={p.user_id}>{p.user_id}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${statusMap[p.status] || statusMap.draft}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm opacity-70">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


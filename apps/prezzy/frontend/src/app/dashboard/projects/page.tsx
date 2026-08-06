import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DeleteProjectButton from './DeleteProjectButton';

export default async function Projects() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, type, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const statusMap: Record<string, { label: string; classes: string }> = {
    draft: { label: 'Rascunho', classes: 'bg-slate-500/10 text-slate-500' },
    pending_approval: { label: 'Aguardando Aprovação', classes: 'bg-yellow-500/10 text-yellow-500' },
    generating: { label: 'Gerando...', classes: 'bg-blue-500/10 text-blue-500' },
    completed: { label: 'Concluído', classes: 'bg-green-500/10 text-green-500' },
    failed: { label: 'Falhou', classes: 'bg-red-500/10 text-red-500' },
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Todos os Projetos</h1>
      
      {!projects || projects.length === 0 ? (
        <div className="text-center p-12 bg-panel rounded-xl border border-rule">
          <p className="opacity-50">Você ainda não possui projetos.</p>
        </div>
      ) : (
        <div className="bg-panel rounded-xl border border-rule overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-rule bg-panel-2/50 text-sm opacity-70">
                <th className="p-4 font-medium">Projeto</th>
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const status = statusMap[p.status] || statusMap.draft;
                return (
                  <tr key={p.id} className="border-b border-rule last:border-0 hover:bg-rule/30 transition-colors">
                    <td className="p-4 font-medium">{p.title}</td>
                    <td className="p-4 text-sm opacity-70">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <span className={`${status.classes} px-3 py-1 rounded-full text-xs font-medium`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2 items-center">
                      {p.status === 'pending_approval' && (
                        <Link href={`/dashboard/project/${p.id}/review`} className="text-yellow-500 text-sm font-bold bg-yellow-500/10 px-4 py-1.5 rounded-full hover:bg-yellow-500/20 transition-colors">
                          Revisar e Aprovar
                        </Link>
                      )}
                      {p.status === 'completed' && (
                        <>
                          <Link href={`/dashboard/project/${p.id}/preview`} className="text-cyan-500 text-sm font-bold bg-cyan-500/10 px-4 py-1.5 rounded-full hover:bg-cyan-500/20 transition-colors">
                            Preview
                          </Link>
                          <a href={`/dashboard/project/${p.id}/download`} className="text-primary text-sm font-bold bg-primary/10 px-4 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                            Baixar PDF
                          </a>
                        </>
                      )}
                      <DeleteProjectButton projectId={p.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from './logout-button';
import StatusPoller from './status-poller';

export default async function Dashboard() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('credits, is_superuser')
    .eq('id', user.id)
    .single();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, type, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const credits = profile?.credits ?? 50;

  const statusMap: Record<string, { label: string; classes: string }> = {
    draft: { label: 'Rascunho', classes: 'bg-slate-500/10 text-slate-500' },
    pending_approval: { label: 'Aguardando Aprovação', classes: 'bg-yellow-500/10 text-yellow-500' },
    generating: { label: 'Gerando...', classes: 'bg-blue-500/10 text-blue-500' },
    completed: { label: 'Concluído', classes: 'bg-green-500/10 text-green-500' },
    failed: { label: 'Falhou', classes: 'bg-red-500/10 text-red-500' },
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <header className="flex justify-between items-center mb-12 pb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm opacity-50 mt-1">Bem-vindo(a), {user.email}</p>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm bg-panel px-4 py-2 rounded-full border border-rule text-primary font-medium shadow-sm">
            ?? {credits} Créditos
          </span>
          <Link href="/dashboard/templates" className="bg-panel border border-rule hover:border-primary text-foreground px-6 py-2 rounded-lg font-medium transition-all">
            Ver Templates
          </Link>
          <Link href="/dashboard/wizard" className="bg-primary hover:bg-accent text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md">
            + Novo Projeto
          </Link>
        </div>
      </header>

      <StatusPoller projects={(projects || []).map(p => ({ id: p.id, status: p.status }))} />
      {(!projects || projects.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 opacity-50">
          <p className="text-lg mb-4">Nenhum projeto ainda.</p>
          <Link href="/dashboard/wizard" className="text-primary hover:underline font-medium">
            Crie seu primeiro projeto ?
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((project) => {
            const status = statusMap[project.status] ?? statusMap.draft;
            return (
              <Link
                key={project.id}
                href={project.status === 'pending_approval' ? `/dashboard/project/${project.id}/review` : project.status === 'completed' ? `/dashboard/project/${project.id}/preview` : '#'}
                className="bg-panel p-6 rounded-xl border border-rule hover:border-primary transition-all duration-300 cursor-pointer group"
              >
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="opacity-70 text-sm mb-6">
                  {new Date(project.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex justify-between items-center text-sm border-t border-rule pt-4">
                  <span className={`${status.classes} px-3 py-1 rounded-full text-xs font-medium`}>
                    {status.label}
                  </span>
                  {project.status === 'completed' && (
                    <span className="opacity-80 hover:opacity-100 font-medium">Pré-visualizar PDF ?</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


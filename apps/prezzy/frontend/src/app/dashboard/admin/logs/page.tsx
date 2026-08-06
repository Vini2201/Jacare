import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ScrollText } from 'lucide-react';

export default async function AdminLogs() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: logs } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const sevMap: Record<string, string> = {
    info: 'bg-blue-500/10 text-blue-500',
    warning: 'bg-yellow-500/10 text-yellow-500',
    critical: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <ScrollText className="text-primary" /> Audit Logs
      </h1>
      
      {!logs || logs.length === 0 ? (
        <div className="text-center p-12 bg-panel rounded-xl border border-rule">
          <p className="opacity-50">Nenhum log registrado ainda.</p>
        </div>
      ) : (
        <div className="bg-panel rounded-xl border border-rule overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-rule bg-panel-2/50 text-sm opacity-70">
                <th className="p-4 font-medium">Timestamp</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium">Evento</th>
                <th className="p-4 font-medium">Mensagem</th>
                <th className="p-4 font-medium">Severidade</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-rule last:border-0 hover:bg-rule/30 transition-colors">
                  <td className="p-4 text-xs font-mono opacity-70 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-4 text-sm font-medium uppercase opacity-70">{log.category}</td>
                  <td className="p-4 text-sm font-bold">{log.event_type}</td>
                  <td className="p-4 text-sm opacity-80 max-w-md truncate" title={log.message}>
                    {log.message}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${sevMap[log.severity] || sevMap.info}`}>
                      {log.severity}
                    </span>
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


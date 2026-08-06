"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface Metrics {
  active_users: number;
  generations_today: number;
  tokens_consumed: number;
  estimated_cost: number;
}

interface Provider {
  id: string;
  provider: string;
  key_value: string;
  is_active: boolean;
  usage_count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form states for new provider
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState('openai');
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    try {
      // Load Metrics
      const metricsResp = await fetch(`${apiUrl}/api/admin/metrics`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (metricsResp.ok) setMetrics(await metricsResp.json());

      // Load Providers
      const providersResp = await fetch(`${apiUrl}/api/admin/providers`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (providersResp.ok) {
        const data = await providersResp.json();
        setProviders(data.providers);
      }
    } catch (err: any) {
      setError("Falha ao carregar dados do servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProvider(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const resp = await fetch(`${apiUrl}/api/admin/providers`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: newProvider,
        key_value: newKey,
        is_active: true
      })
    });

    if (resp.ok) {
      setShowAddProvider(false);
      setNewKey('');
      loadData();
    } else {
      setError("Falha ao adicionar provedor.");
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-8">Carregando painel administrativo...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <header className="flex justify-between items-center mb-12 border-b border-rule pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="bg-primary/20 text-primary px-3 py-1 rounded text-sm font-mono tracking-widest uppercase">
              Superuser
            </span>
            Painel Administrativo
          </h1>
          <p className="opacity-70 mt-2">Gestão global do SaaS PREZZY e Provedores de IA</p>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {/* Métricas globais */}
        <div className="bg-panel p-6 rounded-xl border border-rule">
          <h4 className="text-sm opacity-70 uppercase tracking-wider mb-2">Usuários Ativos</h4>
          <p className="text-4xl font-light">{metrics?.active_users || 0}</p>
        </div>
        <div className="bg-panel p-6 rounded-xl border border-rule">
          <h4 className="text-sm opacity-70 uppercase tracking-wider mb-2">Gerações</h4>
          <p className="text-4xl font-light">{metrics?.generations_today || 0}</p>
        </div>
        <div className="bg-panel p-6 rounded-xl border border-rule">
          <h4 className="text-sm opacity-70 uppercase tracking-wider mb-2">Tokens Estimados</h4>
          <p className="text-4xl font-light text-primary">{metrics?.tokens_consumed || 0}</p>
        </div>
        <div className="bg-panel p-6 rounded-xl border border-rule">
          <h4 className="text-sm opacity-70 uppercase tracking-wider mb-2">Custo Estimado</h4>
          <p className="text-4xl font-light">$ {metrics?.estimated_cost?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gestão de Chaves de API */}
        <div className="bg-panel rounded-xl border border-rule p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Roteamento Multi-IA</h3>
            <button 
              onClick={() => setShowAddProvider(!showAddProvider)}
              className="text-sm text-primary hover:underline"
            >
              + Adicionar Provedor
            </button>
          </div>

          {showAddProvider && (
            <form onSubmit={handleAddProvider} className="mb-6 p-4 border border-rule rounded-lg bg-background">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm opacity-70 mb-1 block">Provedor</label>
                  <select 
                    value={newProvider} 
                    onChange={e => setNewProvider(e.target.value)}
                    className="w-full bg-panel border border-rule p-2 rounded"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="nvidia">NVIDIA</option>
                    <option value="groq">Groq</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm opacity-70 mb-1 block">API Key</label>
                  <input 
                    type="password" 
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    required
                    className="w-full bg-panel border border-rule p-2 rounded"
                    placeholder="sk-..."
                  />
                </div>
                <button type="submit" className="bg-primary text-white p-2 rounded font-bold hover:bg-accent">
                  Salvar
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {providers.length === 0 ? (
              <p className="text-sm opacity-50">Nenhum provedor cadastrado no banco. Usando variáveis de ambiente.</p>
            ) : (
              providers.map((p) => (
                <div key={p.id} className={`flex justify-between items-center p-4 border rounded-lg ${p.is_active ? 'border-primary/30 bg-primary/5' : 'border-rule opacity-50'}`}>
                  <div>
                    <p className="font-bold uppercase">{p.provider}</p>
                    <p className="text-sm opacity-70 font-mono mt-1">
                      {p.key_value.substring(0, 4)}...{p.key_value.substring(p.key_value.length - 4)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${p.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                    {p.is_active ? 'Ativo' : 'Desativado'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

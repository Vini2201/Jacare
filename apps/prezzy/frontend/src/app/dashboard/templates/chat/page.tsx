'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Bot, Send, Sparkles, History, Wand2, Link2 } from 'lucide-react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type ChatSession = { id: string; title: string; createdAt: string; messages: ChatMessage[] };

type ProjectInfo = { id: string; title: string; status: string } | null;

const STORAGE_KEY = 'prezzy_refactor_chats';

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function TemplateChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState('groq');
  const [projectId, setProjectId] = useState('');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(null);
  const [projectLoading, setProjectLoading] = useState(false);

  useEffect(() => {
    const initial = loadSessions();
    if (initial.length === 0) {
      const seed: ChatSession = {
        id: crypto.randomUUID(),
        title: 'Ideias para reduzir atrito no fluxo',
        createdAt: new Date().toISOString(),
        messages: [{ role: 'assistant', content: 'Me diga o que você quer melhorar e eu te devolvo um plano prático com riscos, priorização e possíveis refatorações.' }],
      };
      setSessions([seed]);
      setActiveId(seed.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([seed]));
    } else {
      setSessions(initial);
      setActiveId(initial[0].id);
    }
  }, []);

  useEffect(() => {
    if (sessions.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    async function loadProjectContext() {
      const id = projectId.trim();
      if (!id) {
        setProjectInfo(null);
        return;
      }

      try {
        setProjectLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const resp = await fetch(`${apiUrl}/api/projects/${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!resp.ok) {
          setProjectInfo(null);
          return;
        }

        const data = await resp.json();
        setProjectInfo({
          id,
          title: data.project?.title || 'Projeto encontrado',
          status: data.project?.status || 'unknown',
        });
      } finally {
        setProjectLoading(false);
      }
    }

    const timer = setTimeout(loadProjectContext, 350);
    return () => clearTimeout(timer);
  }, [projectId, supabase]);

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeId) || sessions[0], [sessions, activeId]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !activeSession) return;
    setSending(true);
    setInput('');

    setSessions((current) => current.map((session) => {
      if (session.id !== activeSession.id) return session;
      return { ...session, messages: [...session.messages, { role: 'user', content: text }] };
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const payload = {
        provider,
        project_id: projectInfo?.id || undefined,
        focus: projectInfo ? `${projectInfo.title} (${projectInfo.status})` : undefined,
        messages: [...activeSession.messages, { role: 'user', content: text }],
      };
      const resp = await fetch(`${apiUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        throw new Error(errData?.detail || 'Falha ao conversar com a IA.');
      }

      const data = await resp.json();
      const answer = data.reply || 'Sem resposta.';
      setSessions((current) => current.map((session) => {
        if (session.id !== activeSession.id) return session;
        const updated = [...session.messages, { role: 'user', content: text }, { role: 'assistant', content: answer }];
        return { ...session, messages: updated, title: session.title === 'Nova conversa' ? text.slice(0, 42) : session.title };
      }));
    } catch (err: any) {
      setSessions((current) => current.map((session) => {
        if (session.id !== activeSession.id) return session;
        return { ...session, messages: [...session.messages, { role: 'assistant', content: `Erro: ${err.message}` }] };
      }));
    } finally {
      setSending(false);
    }
  }

  function newConversation() {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: 'Nova conversa',
      createdAt: new Date().toISOString(),
      messages: [{ role: 'assistant', content: 'Comece me dizendo o que você quer ajustar no produto ou no código.' }],
    };
    setSessions((current) => [session, ...current]);
    setActiveId(session.id);
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-[0.32fr_0.68fr]">
        <aside className="rounded-3xl border border-rule bg-panel p-6 h-fit sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] opacity-50 mb-2">Chat IA</p>
              <h1 className="text-3xl font-bold">Refatorações</h1>
            </div>
            <button onClick={newConversation} className="p-3 rounded-xl border border-rule hover:border-primary transition-colors"><Wand2 size={18} /></button>
          </div>

          <div className="space-y-3 mb-6">
            {sessions.map((session) => (
              <button key={session.id} onClick={() => setActiveId(session.id)} className={`w-full text-left p-4 rounded-2xl border transition-colors ${activeId === session.id ? 'border-primary bg-primary/5' : 'border-rule hover:border-primary/40'}`}>
                <div className="font-bold truncate">{session.title}</div>
                <div className="text-xs opacity-50 mt-1">{new Date(session.createdAt).toLocaleString('pt-BR')}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-rule bg-background p-4">
              <label className="block text-xs uppercase tracking-[0.25em] opacity-50 mb-2">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full bg-transparent outline-none">
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="nvidia">NVIDIA</option>
              </select>
            </div>
            <div className="rounded-2xl border border-rule bg-background p-4">
              <label className="block text-xs uppercase tracking-[0.25em] opacity-50 mb-2">Projeto</label>
              <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Opcional: ID do projeto" className="w-full bg-transparent outline-none placeholder:opacity-40" />
              <div className="mt-3 text-xs opacity-70 flex items-center gap-2 min-h-5">
                {projectLoading ? 'Buscando contexto...' : projectInfo ? <><Link2 size={12} /> {projectInfo.title} · {projectInfo.status}</> : 'Sem projeto vinculado'}
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/templates')} className="w-full rounded-2xl border border-rule bg-background p-4 font-bold hover:border-primary transition-colors inline-flex items-center justify-center gap-2">
              <Sparkles size={16} /> Ver templates
            </button>
          </div>
        </aside>

        <main className="rounded-3xl border border-rule bg-panel p-6 flex flex-col min-h-[80vh]">
          <div className="flex items-center justify-between border-b border-rule pb-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] opacity-50 mb-2 flex items-center gap-2"><History size={14} /> Histórico</p>
              <h2 className="text-2xl font-bold">{activeSession?.title || 'Nova conversa'}</h2>
            </div>
            <p className="text-sm opacity-60">Peça ajustes, novas seções, refatorações e decisões de produto.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {activeSession?.messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-3xl px-5 py-4 border ${message.role === 'user' ? 'bg-primary text-white border-primary/30' : 'bg-background border-rule'}`}>
                  <div className="text-xs uppercase tracking-[0.25em] opacity-50 mb-2 flex items-center gap-2">{message.role === 'user' ? 'Você' : <Bot size={12} />}{message.role === 'assistant' ? 'IA' : ''}</div>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-rule bg-background p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Refatore a tela de templates para ficar mais clara e adicione filtros de estilo"
              rows={4}
              className="w-full bg-transparent outline-none resize-none placeholder:opacity-40"
            />
            <div className="flex items-center justify-between gap-4 mt-4">
              <p className="text-xs opacity-50">A conversa fica salva neste navegador para você continuar depois.</p>
              <button onClick={sendMessage} disabled={sending} className="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-accent transition-colors">
                {sending ? 'Enviando...' : 'Enviar'} <Send size={16} />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


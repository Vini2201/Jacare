"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { LayoutTemplate, Image as ImageIcon } from 'lucide-react';

export default function Wizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('presentation');
  const [language, setLanguage] = useState('pt-BR');
  
  // Design state
  const [templateId, setTemplateId] = useState('template_infoproduct_dark');
  const [useImages, setUseImages] = useState(true);

  // Content state
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('profissional');
  const [objectives, setObjectives] = useState('');

  const templates = [
    { id: 'template_infoproduct_dark', name: 'Hacker / Cyberpunk', desc: 'Dark mode, agressivo, infoprodutos.' },
    { id: 'template_corporate_light', name: 'Corporativo ClÃ¡ssico', desc: 'Light mode, limpo, B2B.' },
    { id: 'template_dynamic_glass', name: 'Glassmorphism', desc: 'SaaS, moderno, transparente.' },
    { id: 'template_dynamic_brutalist', name: 'Brutalismo', desc: 'Impactante, bordas fortes.' },
    { id: 'template_dynamic_elegant', name: 'Editorial Elegante', desc: 'Clean, serifas, foco em leitura.' }
  ];

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('SessÃ£o expirada. FaÃ§a login novamente.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // 1. Create project + upload file
      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', type);
      formData.append('language', language);
      formData.append('audience', audience);
      formData.append('tone', tone);
      formData.append('objectives', objectives);
      
      // New fields for frontend
      formData.append('template_id', templateId);
      formData.append('use_images', useImages ? 'true' : 'false');
      
      if (file) {
        formData.append('file', file);
      }

      const createResp = await fetch(`${apiUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!createResp.ok) {
        const errData = await createResp.json();
        throw new Error(errData.detail || 'Erro ao criar projeto.');
      }

      const { project } = await createResp.json();
      const projectId = project?.id;

      if (!projectId) {
        throw new Error('Backend nÃ£o retornou o ID do projeto.');
      }

      // 2. Start generation (enqueue in Redis)
      const genResp = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          provider: 'groq', // default to Groq now based on user preference
        }),
      });

      if (!genResp.ok) {
        const errData = await genResp.json();
        throw new Error(errData.detail || 'Erro ao iniciar geraÃ§Ã£o.');
      }

      router.push('/dashboard/projects');
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  const fileTypes = '.pdf,.docx,.xlsx,.csv,.txt,.md';

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Novo Projeto</h1>
            <p className="opacity-70 mt-1">Passo {step} de 4</p>
          </div>
          <Link href="/dashboard/projects" className="text-sm opacity-50 hover:opacity-100 hover:text-primary transition-all">
            â† Cancelar
          </Link>
        </div>

        <div className="w-full bg-panel-2 rounded-full h-1.5 mb-10">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Tipo e TÃ­tulo */}
        {step === 1 && (
          <div className="bg-panel p-8 rounded-2xl border border-rule space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">Tipo de Documento</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setType('presentation')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    type === 'presentation'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-rule hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl block mb-2">ðŸ“Š</span>
                  <span className="font-bold">ApresentaÃ§Ã£o</span>
                  <p className="text-xs opacity-70 mt-1">Slides em PDF (1920Ã—1080)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setType('ebook')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    type === 'ebook'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-rule hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl block mb-2">ðŸ“–</span>
                  <span className="font-bold">eBook</span>
                  <p className="text-xs opacity-70 mt-1">Documento em A4 com capÃ­tulos</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">TÃ­tulo do Projeto</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Onboarding de Novos Colaboradores 2025"
                className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">Idioma</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors"
              >
                <option value="pt-BR">ðŸ‡§ðŸ‡· PortuguÃªs (Brasil)</option>
                <option value="en-US">ðŸ‡ºðŸ‡¸ English (US)</option>
                <option value="es-ES">ðŸ‡ªðŸ‡¸ EspaÃ±ol</option>
              </select>
            </div>

            <button
              onClick={() => title ? setStep(2) : setError('Preencha o tÃ­tulo.')}
              className="w-full bg-primary text-white p-3 rounded-lg hover:bg-accent transition-colors font-bold"
            >
              PrÃ³ximo â†’
            </button>
          </div>
        )}

        {/* Step 2: Design */}
        {step === 2 && (
          <div className="bg-panel p-8 rounded-2xl border border-rule space-y-6">
            <div>
              <label className="block text-sm font-medium mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-primary" /> Escolha o Tema Visual
              </label>
              <div className="space-y-3">
                {templates.map(t => (
                  <label key={t.id} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${templateId === t.id ? 'border-primary bg-primary/10' : 'border-rule hover:bg-rule/30'}`}>
                    <input 
                      type="radio" 
                      name="template" 
                      value={t.id} 
                      checked={templateId === t.id}
                      onChange={() => setTemplateId(t.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-bold text-white">{t.name}</p>
                      <p className="text-sm opacity-70">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-rule">
              <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl bg-background border border-rule">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">Gerar Imagens com IA</p>
                    <p className="text-xs opacity-70">A IA vai escolher e inserir imagens contextuais nos slides.</p>
                  </div>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={useImages} onChange={(e) => setUseImages(e.target.checked)} />
                  <div className="w-11 h-6 bg-rule rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-rule p-3 rounded-lg hover:border-primary transition-colors font-bold"
              >
                â† Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-accent transition-colors font-bold"
              >
                PrÃ³ximo â†’
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Briefing */}
        {step === 3 && (
          <div className="bg-panel p-8 rounded-2xl border border-rule space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">PÃºblico-alvo</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Ex: Gestores de RH, novos colaboradores"
                className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">Tom de Voz</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors"
              >
                <option value="profissional">Profissional</option>
                <option value="casual">Casual</option>
                <option value="didÃ¡tico">DidÃ¡tico</option>
                <option value="corporativo">Corporativo</option>
                <option value="inspiracional">Inspiracional</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">Objetivos Principais (separados por vÃ­rgula)</label>
              <textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="Ex: Apresentar a cultura da empresa, Explicar os benefÃ­cios, Mostrar os processos internos"
                rows={3}
                className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-rule p-3 rounded-lg hover:border-primary transition-colors font-bold"
              >
                â† Voltar
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-accent transition-colors font-bold"
              >
                PrÃ³ximo â†’
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Upload e Confirmar */}
        {step === 4 && (
          <div className="bg-panel p-8 rounded-2xl border border-rule space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">
                Arquivo de ReferÃªncia (opcional)
              </label>
              <p className="text-xs opacity-50 mb-3">
                Suba um PDF, Word, Excel ou TXT. A IA usarÃ¡ esse conteÃºdo como base de conhecimento (RAG).
              </p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-rule rounded-xl cursor-pointer hover:border-primary transition-colors">
                <input
                  type="file"
                  accept={fileTypes}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? (
                  <div className="text-center">
                    <p className="text-primary font-medium">{file.name}</p>
                    <p className="text-xs opacity-50 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center opacity-50">
                    <p className="text-2xl mb-1">ðŸ“Ž</p>
                    <p className="text-sm">Clique para selecionar ou arraste</p>
                  </div>
                )}
              </label>
            </div>

            {/* Summary */}
            <div className="bg-background p-4 rounded-lg border border-rule text-sm space-y-2">
              <p><span className="opacity-50">TÃ­tulo:</span> <span className="font-medium">{title}</span></p>
              <p><span className="opacity-50">Template:</span> <span className="font-medium text-primary">{templates.find(t=>t.id===templateId)?.name}</span></p>
              <p><span className="opacity-50">Imagens via IA:</span> <span className="font-medium">{useImages ? 'Sim' : 'NÃ£o'}</span></p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 border border-rule p-3 rounded-lg hover:border-primary transition-colors font-bold"
              >
                â† Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-accent transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {loading ? 'â³ Gerando...' : 'ðŸš€ Gerar Rascunho (IA)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


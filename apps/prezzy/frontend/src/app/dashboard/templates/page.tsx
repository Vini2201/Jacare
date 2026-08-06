'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Layers3, Sparkles, TabletSmartphone } from 'lucide-react';

type Template = {
  id: string;
  name: string;
  description: string;
  design_pattern: string;
  thumbnail_url: string;
  render_config: {
    requires_js: boolean;
    complex_layout: boolean;
    engine_preference: string;
  };
};

const previewAccent: Record<string, string> = {
  template_corporate_light: 'from-slate-50 to-slate-200 text-slate-900',
  template_infoproduct_dark: 'from-slate-950 to-slate-800 text-white',
  template_dynamic_glass: 'from-cyan-100 via-sky-100 to-indigo-100 text-slate-900',
  template_dynamic_brutalist: 'from-amber-100 via-orange-100 to-rose-100 text-slate-900',
  template_dynamic_elegant: 'from-stone-100 to-amber-50 text-stone-900',
};

function TemplateMockup({ template }: { template: Template }) {
  const accent = previewAccent[template.id] ?? 'from-slate-100 to-slate-200 text-slate-900';
  return (
    <div className={`rounded-2xl border border-rule bg-gradient-to-br ${accent} p-4 shadow-lg overflow-hidden`}>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <div className="h-2 w-16 rounded-full bg-current opacity-20" />
          <div className="h-2 w-28 rounded-full bg-current opacity-10" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] opacity-50">Preview</span>
      </div>
      <div className="grid gap-3">
        <div className="rounded-xl bg-white/12 backdrop-blur-md border border-white/20 p-3">
          <div className="h-4 w-3/4 rounded bg-current opacity-30 mb-2" />
          <div className="h-3 w-full rounded bg-current opacity-15 mb-1" />
          <div className="h-3 w-5/6 rounded bg-current opacity-15" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/12 h-16 border border-white/20" />
          <div className="rounded-xl bg-white/12 h-16 border border-white/20 col-span-2" />
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string>('template_infoproduct_dark');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTemplates() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const resp = await fetch(`${apiUrl}/api/templates/catalog`);
        if (!resp.ok) throw new Error('Falha ao carregar templates.');
        const data = await resp.json();
        const list = Object.entries(data.templates).map(([id, value]: any) => ({ id, ...value }));
        setTemplates(list);
        setSelected((current) => current || list[0]?.id || '');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  const active = useMemo(() => templates.find((t) => t.id === selected) || templates[0], [templates, selected]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] opacity-50 mb-3">Templates</p>
            <h1 className="text-4xl font-bold tracking-tight">Biblioteca visual de PDFs</h1>
            <p className="opacity-70 mt-3 max-w-3xl">
              Compare rapidamente cada modelo, veja a estética, entenda a finalidade e escolha o template ideal antes de gerar o documento.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/templates/chat')}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:bg-accent transition-colors"
          >
            Pedir melhorias à IA <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 rounded-2xl border border-rule bg-panel">Carregando templates...</div>
        ) : error ? (
          <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="grid gap-5 md:grid-cols-2">
              {templates.map((template) => {
                const isActive = template.id === active?.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelected(template.id)}
                    className={`text-left rounded-3xl border p-5 transition-all duration-300 ${isActive ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-rule bg-panel hover:border-primary/40 hover:-translate-y-0.5'}`}
                  >
                    <TemplateMockup template={template} />
                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold">{template.name}</h2>
                        {isActive && <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Selecionado</span>}
                      </div>
                      <p className="text-sm opacity-70 mt-2 leading-relaxed">{template.description}</p>
                      <div className="flex flex-wrap gap-2 mt-4 text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-background border border-rule">Engine: {template.render_config.engine_preference}</span>
                        <span className="px-2.5 py-1 rounded-full bg-background border border-rule">Layout: {template.render_config.complex_layout ? 'Complexo' : 'Leve'}</span>
                        <span className="px-2.5 py-1 rounded-full bg-background border border-rule">JS: {template.render_config.requires_js ? 'Sim' : 'Não'}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {active && (
              <aside className="rounded-3xl border border-rule bg-panel p-6 sticky top-8 self-start">
                <p className="text-xs uppercase tracking-[0.35em] opacity-50 mb-4">Template em foco</p>
                <h2 className="text-3xl font-bold mb-3">{active.name}</h2>
                <p className="opacity-70 leading-relaxed mb-6">{active.design_pattern}</p>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-background border border-rule p-4">
                    <div className="flex items-center gap-3 mb-2"><FileText size={18} className="text-primary" />Finalidade</div>
                    <p className="text-sm opacity-70">{active.description}</p>
                  </div>
                  <div className="rounded-2xl bg-background border border-rule p-4">
                    <div className="flex items-center gap-3 mb-2"><Layers3 size={18} className="text-primary" />Compatibilidade</div>
                    <p className="text-sm opacity-70">{active.render_config.engine_preference === 'cloudconvert' ? 'Recomendado para layouts mais pesados e visuais sofisticados.' : 'Perfeito para PDFs leves, previsíveis e rápidos de renderizar.'}</p>
                  </div>
                  <div className="rounded-2xl bg-background border border-rule p-4">
                    <div className="flex items-center gap-3 mb-2"><TabletSmartphone size={18} className="text-primary" />Uso sugerido</div>
                    <p className="text-sm opacity-70">{active.id === 'template_infoproduct_dark' ? 'Lançamentos, páginas de venda e apresentações com alto impacto.' : active.id === 'template_dynamic_elegant' ? 'Marcas premium, moda, editorial e materiais mais refinados.' : 'Produtos digitais, relatórios modernos e apresentações com forte personalidade.'}</p>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/dashboard/wizard')}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:bg-accent transition-colors"
                >
                  Usar este template <Sparkles size={16} />
                </button>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


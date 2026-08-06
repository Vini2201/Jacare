"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Edit2, Play, Image as ImageIcon } from 'lucide-react';

export default function ReviewProject({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const [project, setProject] = useState<any>(null);
  const [generation, setGeneration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!res.ok) {
          throw new Error('Não foi possível carregar o projeto.');
        }

        const data = await res.json();
        setProject(data.project);
        setGeneration(data.generation);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (projectId) loadData();
  }, [projectId, router]);

  const handleTextChange = (slideIndex: number, field: string, value: string) => {
    const updatedGen = { ...generation };
    updatedGen.draft_outline.slides[slideIndex][field] = value;
    setGeneration(updatedGen);
  };

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const res = await fetch(`${apiUrl}/api/projects/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project.id,
          final_draft_dict: generation.draft_outline
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Erro ao aprovar rascunho.');
      }

      router.push('/dashboard/projects');
      router.refresh();
      
    } catch (err: any) {
      setError(err.message);
      setApproving(false);
    }
  };

  if (loading) return <div className="p-8 text-center opacity-50">Carregando rascunho...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!project || !generation || !generation.draft_outline) {
    return <div className="p-8">Rascunho não encontrado.</div>;
  }

  const outline = generation.draft_outline;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-rule">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revisão Humana (HITL)</h1>
            <p className="opacity-70 mt-1">Projeto: <span className="font-bold text-primary">{project.title}</span></p>
          </div>
          <Link href="/dashboard/projects" className="text-sm opacity-50 hover:opacity-100 hover:text-primary transition-all">
            ← Voltar
          </Link>
        </div>

        <div className="mb-8 bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl flex items-start gap-4">
          <Edit2 className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">A IA finalizou o trabalho bruto!</p>
            <p className="text-sm opacity-80">Edite os textos dos slides abaixo se necessário. Quando estiver satisfeito, aprove para que o Playwright renderize o PDF final com o Design escolhido.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-panel border border-rule p-6 rounded-2xl">
            <h2 className="text-xs uppercase tracking-widest opacity-50 font-bold mb-4">Título Principal</h2>
            <input 
              className="w-full bg-background border border-rule p-4 rounded-lg font-bold text-2xl focus:border-primary focus:outline-none transition-colors"
              value={outline.title}
              onChange={(e) => {
                const updatedGen = { ...generation };
                updatedGen.draft_outline.title = e.target.value;
                setGeneration(updatedGen);
              }}
            />
          </div>

          {outline.slides?.map((slide: any, idx: number) => (
            <div key={idx} className="bg-panel border border-rule p-6 rounded-2xl flex gap-6">
              <div className="shrink-0 w-16 h-16 bg-rule rounded-full flex items-center justify-center font-bold text-xl">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest opacity-50 font-bold mb-2">Headline (Título do Slide)</label>
                  <input 
                    className="w-full bg-background border border-rule p-3 rounded-lg font-bold text-lg focus:border-primary focus:outline-none transition-colors"
                    value={slide.headline}
                    onChange={(e) => handleTextChange(idx, 'headline', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest opacity-50 font-bold mb-2">Corpo do Texto</label>
                  <textarea 
                    className="w-full bg-background border border-rule p-3 rounded-lg text-sm focus:border-primary focus:outline-none transition-colors resize-none"
                    rows={4}
                    value={slide.body_text}
                    onChange={(e) => handleTextChange(idx, 'body_text', e.target.value)}
                  />
                </div>
                
                {slide.image_prompt && (
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-rule">
                    <ImageIcon className="w-5 h-5 opacity-50" />
                    <input 
                      className="flex-1 bg-transparent text-xs opacity-70 focus:outline-none"
                      value={slide.image_prompt}
                      onChange={(e) => handleTextChange(idx, 'image_prompt', e.target.value)}
                      placeholder="Prompt de Imagem ou URL HTTP"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-panel border-t border-rule p-6 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-bold">{outline.slides?.length} Slides processados</p>
            <p className="text-xs opacity-50">Design escolhido: {generation.briefing_data?.template_id || 'Padrão'}</p>
          </div>
          <button 
            onClick={handleApprove}
            disabled={approving}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-accent transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {approving ? (
              <>⏳ Iniciando Render Engine...</>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" /> Aprovar Rascunho & Gerar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


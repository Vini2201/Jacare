'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Eye, Download, ArrowLeft } from 'lucide-react';

export default function ProjectPreview({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();

    async function loadPreview() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const resp = await fetch(`${apiUrl}/api/projects/${projectId}/download`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          throw new Error(data?.detail || 'N�o foi poss�vel carregar a pr�-visualiza��o.');
        }

        const data = await resp.json();
        setPreviewUrl(data.download_url);

        const projectResp = await fetch(`${apiUrl}/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (projectResp.ok) {
          const projectData = await projectResp.json();
          setTitle(projectData.project?.title || 'Preview do PDF');
          setStatus(projectData.project?.status || 'unknown');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (projectId) loadPreview();
  }, [projectId, router]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <button onClick={() => router.push('/dashboard/projects')} className="text-sm opacity-60 hover:opacity-100 inline-flex items-center gap-2 mb-4"><ArrowLeft size={16} /> Voltar</button>
            <p className="text-xs uppercase tracking-[0.35em] opacity-50 mb-2">Preview PDF</p>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Eye className="text-primary" /> {title || 'Pr�-visualiza��o'}</h1>
            <p className="opacity-70 mt-2">Status: {status}</p>
          </div>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:bg-accent transition-colors">
              Abrir PDF <Download size={16} />
            </a>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-rule bg-panel p-8">Carregando preview...</div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-500">{error}</div>
        ) : previewUrl ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-rule bg-panel p-3 min-h-[80vh]">
              <iframe title="PDF Preview" src={previewUrl} className="w-full h-[80vh] rounded-2xl bg-white" />
            </div>
            <aside className="rounded-3xl border border-rule bg-panel p-6 self-start sticky top-8">
              <h2 className="text-2xl font-bold mb-4">An�lise r�pida</h2>
              <ul className="space-y-3 text-sm opacity-80">
                <li>Veja margens, contraste e hierarquia sem baixar o arquivo.</li>
                <li>Abra em nova aba se quiser uma leitura mais confort�vel.</li>
                <li>Use o cat�logo de templates para comparar antes de gerar a pr�xima vers�o.</li>
              </ul>
              <button onClick={() => router.push('/dashboard/templates')} className="mt-6 w-full border border-rule rounded-xl py-3 font-bold hover:border-primary transition-colors">
                Escolher outro template
              </button>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

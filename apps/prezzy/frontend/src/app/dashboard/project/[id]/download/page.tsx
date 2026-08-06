"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function DownloadProject({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const [message, setMessage] = useState('Preparando o download...');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function startDownload() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/projects/${projectId}/download`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.detail || 'N�o foi poss�vel gerar o link de download.');
        }

        const data = await res.json();
        if (!data.download_url) {
          throw new Error('URL do PDF n�o encontrada.');
        }

        setMessage('Redirecionando para o PDF...');
        window.location.href = data.download_url;
      } catch (err: any) {
        setError(err.message);
      }
    }

    if (projectId) startDownload();
  }, [projectId, router]);

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto bg-panel border border-rule rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-2">Falha no download</h1>
          <p className="opacity-70 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="bg-primary text-white px-4 py-2 rounded-lg font-bold"
          >
            Voltar aos projetos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-xl mx-auto bg-panel border border-rule rounded-2xl p-6">
        <h1 className="text-xl font-bold mb-2">Download do PDF</h1>
        <p className="opacity-70">{message}</p>
      </div>
    </div>
  );
}
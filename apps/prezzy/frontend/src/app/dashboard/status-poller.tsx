"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Project {
  id: string;
  status: string;
}

/**
 * Client component that polls the projects table for status changes.
 * When a project goes from 'generating' to 'completed' or 'pending_approval',
 * it triggers a page refresh so the Server Component re-fetches fresh data.
 */
export default function StatusPoller({ projects }: { projects: Project[] }) {
  const supabase = createClient();
  const [activeJobs, setActiveJobs] = useState<string[]>([]);

  useEffect(() => {
    // Find projects that are currently generating
    const generating = projects
      .filter((p) => p.status === 'generating')
      .map((p) => p.id);
    
    setActiveJobs(generating);

    if (generating.length === 0) return;

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      for (const projectId of generating) {
        const { data } = await supabase
          .from('projects')
          .select('status')
          .eq('id', projectId)
          .single();

        if (data && data.status !== 'generating') {
          // Status changed! Refresh the page to re-render Server Component
          window.location.reload();
          return;
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [projects]);

  if (activeJobs.length === 0) return null;

  return (
    <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">
        <span className="font-bold text-primary">{activeJobs.length}</span> projeto(s) em processamento.
        O status atualiza automaticamente.
      </p>
    </div>
  );
}

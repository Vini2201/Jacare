export default function Page() {
  return (
    <div className="p-8">
      <div className="max-w-3xl rounded-2xl border border-rule bg-panel p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-50 mb-3">Admin</p>
        <h1 className="text-3xl font-bold mb-3">Performance</h1>
        <p className="opacity-70 leading-relaxed mb-6">
          Ainda não existe observabilidade detalhada nessa camada. Esta tela vai ser o lugar para latência, fila, render e custos.
        </p>
        <div className="rounded-xl border border-rule bg-background p-4 text-sm opacity-70">
          Próximo passo recomendado: expor métricas reais do worker e do pipeline de renderização.
        </div>
      </div>
    </div>
  );
}


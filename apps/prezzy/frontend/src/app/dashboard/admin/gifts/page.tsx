export default function Page() {
  return (
    <div className="p-8">
      <div className="max-w-3xl rounded-2xl border border-rule bg-panel p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-50 mb-3">Admin</p>
        <h1 className="text-3xl font-bold mb-3">Convites & Gifts</h1>
        <p className="opacity-70 leading-relaxed mb-6">
          Esta seção ainda não tem fluxo final implementado. A ideia é controlar convites, bônus e campanhas de aquisição.
        </p>
        <div className="rounded-xl border border-rule bg-background p-4 text-sm opacity-70">
          Próximo passo recomendado: desenhar um fluxo claro para geração e validação de convites.
        </div>
      </div>
    </div>
  );
}


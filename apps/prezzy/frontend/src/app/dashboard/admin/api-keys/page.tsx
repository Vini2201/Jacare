export default function Page() {
  return (
    <div className="p-8">
      <div className="max-w-3xl rounded-2xl border border-rule bg-panel p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-50 mb-3">Admin</p>
        <h1 className="text-3xl font-bold mb-3">API Keys</h1>
        <p className="opacity-70 leading-relaxed mb-6">
          Esta área vai concentrar a gestão centralizada de chaves, rotação e auditoria de provedores.
          Por enquanto, o controle de provedores continua no painel principal de visão geral.
        </p>
        <div className="rounded-xl border border-rule bg-background p-4 text-sm opacity-70">
          Próximo passo recomendado: mover a criação/edição de chaves para uma tela dedicada e ligar o fluxo à tabela `api_keys`.
        </div>
      </div>
    </div>
  );
}


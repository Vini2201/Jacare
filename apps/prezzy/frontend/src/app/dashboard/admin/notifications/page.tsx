export default function Page() {
  return (
    <div className="p-8">
      <div className="max-w-3xl rounded-2xl border border-rule bg-panel p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-50 mb-3">Admin</p>
        <h1 className="text-3xl font-bold mb-3">Notificações</h1>
        <p className="opacity-70 leading-relaxed mb-6">
          O canal de notificações ainda não foi amarrado a uma camada de eventos persistente nesta interface.
          Por enquanto, os alertas continuam aparecendo nos fluxos de execução e nos logs do backend.
        </p>
        <div className="rounded-xl border border-rule bg-background p-4 text-sm opacity-70">
          Próximo passo recomendado: conectar a tela a `admin_notifications` ou ao stream de eventos do sistema.
        </div>
      </div>
    </div>
  );
}


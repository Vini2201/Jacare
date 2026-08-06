export default function Page() {
  return (
    <div className="p-8">
      <div className="max-w-3xl rounded-2xl border border-rule bg-panel p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-50 mb-3">Settings</p>
        <h1 className="text-3xl font-bold mb-3">Segurança</h1>
        <p className="opacity-70 leading-relaxed mb-6">
          Esta área vai reunir troca de senha, sessões ativas e autenticação de dois fatores.
          Hoje o que existe de fato está no perfil, então mantive esta rota como uma página de transição honesta.
        </p>
        <div className="rounded-xl border border-rule bg-background p-4 text-sm opacity-70">
          Próximo passo recomendado: mover aqui as ações de senha e sessões, e deixar o perfil só para dados pessoais.
        </div>
      </div>
    </div>
  );
}


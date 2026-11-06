import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, BookMarked, Library, Plus, Search, Undo2, KeyRound, X } from "lucide-react";
import banner from "@/assets/banner-livros.jpg";
import { biblioteca, ErroBiblioteca, Livro } from "@/lib/biblioteca";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estante — Gerenciamento de Biblioteca" },
      { name: "description", content: "Cadastre, consulte, alugue e devolva livros do acervo da biblioteca." },
      { property: "og:title", content: "Estante — Gerenciamento de Biblioteca" },
      { property: "og:description", content: "Cadastro, consulta, aluguel e devolução de livros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Filtro = "Todos" | "Disponível" | "Alugado";
type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

const capas = ["bg-tea text-amber", "bg-wood text-styx", "bg-carbon text-amber", "bg-amber text-styx"];
function capaDe(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return capas[h % capas.length];
}

function Index() {
  const [livros, setLivros] = useState<Livro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [alugando, setAlugando] = useState<Livro | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setLivros(await biblioteca.acervo.listar());
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  const executar = async (acao: () => Promise<void>, sucesso: string) => {
    try {
      await acao();
      setAviso({ tipo: "ok", texto: sucesso });
      await recarregar();
      return true;
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof ErroBiblioteca ? e.message : "Algo deu errado." });
      await recarregar();
      return false;
    }
  };

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return livros.filter(
      (l) =>
        (filtro === "Todos" || l.situacao === filtro) &&
        (!q || `${l.titulo} ${l.autor} ${l.genero}`.toLowerCase().includes(q)),
    );
  }, [livros, busca, filtro]);

  const alugados = livros.filter((l) => !l.estaDisponivel());
  const disponiveis = livros.length - alugados.length;

  return (
    <div className="grain min-h-screen p-4 md:p-8">
      <div className="mx-auto grid max-w-[1400px] gap-6 rounded-[2rem] border bg-styx/60 p-4 shadow-card md:p-6 lg:grid-cols-[200px_1fr_340px]">
        {/* Lateral */}
        <aside className="flex flex-row items-center justify-between gap-6 lg:flex-col lg:items-stretch lg:justify-start">
          <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:py-4">
            <div className="grid size-11 place-items-center rounded-xl bg-amber text-styx">
              <Library className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl leading-none">Estante</p>
              <p className="mt-1 text-xs tracking-[0.2em] text-muted-foreground uppercase">Acervo escolar</p>
            </div>
          </div>
          <nav className="flex gap-1 lg:flex-col">
            {(["Todos", "Disponível", "Alugado"] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors ${
                  filtro === f ? "bg-amber font-semibold text-styx" : "text-muted-foreground hover:bg-carbon hover:text-foreground"
                }`}
              >
                {f === "Todos" ? <BookOpen className="size-4" /> : f === "Disponível" ? <BookMarked className="size-4" /> : <KeyRound className="size-4" />}
                <span className="hidden sm:inline">{f === "Todos" ? "Acervo" : f === "Disponível" ? "Disponíveis" : "Alugados"}</span>
              </button>
            ))}
          </nav>
          <p className="hidden text-xs leading-relaxed text-muted-foreground lg:mt-auto lg:block">
            “Uma biblioteca é um hospital para a mente.”
          </p>
        </aside>

        {/* Centro */}
        <main className="min-w-0 space-y-7">
          <label className="flex items-center gap-3 rounded-full border bg-carbon/60 px-5 py-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, autor ou gênero…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          <section className="bg-banner relative overflow-hidden rounded-3xl border">
            <img src={banner} alt="" width={1024} height={768} className="absolute inset-y-0 right-0 h-full w-3/5 object-cover opacity-80 [mask-image:linear-gradient(to_right,transparent,black_45%)]" />
            <div className="relative max-w-md space-y-3 p-8 md:p-10">
              <p className="text-xs tracking-[0.25em] text-amber uppercase">Painel da biblioteca</p>
              <h1 className="text-3xl leading-tight md:text-4xl">
                Cada livro no seu lugar, <em className="text-amber">cada empréstimo</em> registrado.
              </h1>
              <p className="text-sm text-muted-foreground">
                {disponiveis} disponíveis · {alugados.length} alugados
              </p>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-2xl">{filtro === "Todos" ? "Acervo" : filtro === "Disponível" ? "Disponíveis" : "Alugados"}</h2>
              <span className="text-xs text-muted-foreground">{visiveis.length} títulos</span>
            </div>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando acervo…</p>
            ) : visiveis.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum livro encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
                {visiveis.map((l) => (
                  <article key={l.id} className="group flex flex-col">
                    <div className={`relative aspect-[3/4] overflow-hidden rounded-r-xl rounded-l-sm ${capaDe(l.id)} p-4 shadow-card`}>
                      <span className="absolute inset-y-0 left-2 w-px bg-styx/30" />
                      <div className="flex h-full flex-col justify-between pl-2">
                        <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">{l.genero}</span>
                        <p className="font-display text-lg leading-tight">{l.titulo}</p>
                        <span className="text-[11px] opacity-80">{l.autor}</span>
                      </div>
                      <span
                        className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          l.estaDisponivel() ? "bg-styx text-success" : "bg-styx text-amber"
                        }`}
                      >
                        {l.situacao}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-sm font-medium">{l.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.autor}, {l.ano}
                    </p>
                    {l.estaDisponivel() ? (
                      <button onClick={() => setAlugando(l)} className="mt-2 rounded-full bg-amber py-1.5 text-xs font-semibold text-styx transition hover:bg-wood hover:text-foreground">
                        Alugar
                      </button>
                    ) : (
                      <button
                        onClick={() => executar(() => biblioteca.aluguel.alugar(l.id, "—"), "")}
                        className="mt-2 rounded-full border py-1.5 text-xs text-muted-foreground transition hover:border-amber"
                        title="Livro alugado"
                      >
                        Indisponível
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { n: livros.length, r: "Livros no acervo", i: Library },
              { n: disponiveis, r: "Disponíveis", i: BookMarked },
              { n: alugados.length, r: "Alugados agora", i: KeyRound },
            ].map(({ n, r, i: I }) => (
              <div key={r} className="flex items-center gap-4 rounded-2xl border bg-carbon/50 p-4">
                <div className="grid size-11 place-items-center rounded-xl bg-tea text-amber">
                  <I className="size-5" />
                </div>
                <div>
                  <p className="font-display text-2xl leading-none">{String(n).padStart(2, "0")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r}</p>
                </div>
              </div>
            ))}
          </section>
        </main>

        {/* Direita */}
        <aside className="space-y-6">
          <FormCadastro onSalvar={(d) => executar(() => biblioteca.cadastro.cadastrar(d), `“${d.titulo.trim()}” foi cadastrado.`)} />

          <section>
            <h2 className="mb-3 text-xl">Em aluguel</h2>
            <div className="space-y-3">
              {alugados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum livro alugado.</p>}
              {alugados.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-2xl border bg-carbon/50 p-3">
                  <div className={`h-12 w-9 shrink-0 rounded-sm ${capaDe(l.id)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.locatario} · {l.alugadoEm ? new Date(l.alugadoEm).toLocaleDateString("pt-BR") : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => executar(() => biblioteca.devolucao.devolver(l.id), `“${l.titulo}” foi devolvido e está disponível.`)}
                    className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition hover:border-amber hover:text-amber"
                  >
                    <Undo2 className="size-3.5" /> Devolver
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {alugando && (
        <DialogoAluguel
          livro={alugando}
          onFechar={() => setAlugando(null)}
          onConfirmar={async (pessoa) => {
            const ok = await executar(() => biblioteca.aluguel.alugar(alugando.id, pessoa), `“${alugando.titulo}” alugado para ${pessoa.trim()}.`);
            if (ok) setAlugando(null);
          }}
        />
      )}

      {aviso && aviso.texto && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-3 text-sm shadow-card ${
            aviso.tipo === "ok" ? "bg-carbon text-foreground" : "border-destructive bg-styx text-destructive"
          }`}
        >
          {aviso.texto}
        </div>
      )}
    </div>
  );
}

const campo = "w-full rounded-xl border bg-styx px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-amber";

function FormCadastro({ onSalvar }: { onSalvar: (d: { titulo: string; autor: string; genero: string; ano: number }) => Promise<boolean> }) {
  const [f, setF] = useState({ titulo: "", autor: "", genero: "", ano: "" });
  const [salvando, setSalvando] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const ok = await onSalvar({ ...f, ano: Number(f.ano) });
    setSalvando(false);
    if (ok) setF({ titulo: "", autor: "", genero: "", ano: "" });
  };
  return (
    <form onSubmit={enviar} className="space-y-3 rounded-3xl border bg-tea/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Cadastrar livro</h2>
        <div className="grid size-9 place-items-center rounded-lg bg-amber text-styx">
          <Plus className="size-4" />
        </div>
      </div>
      <input className={campo} placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      <input className={campo} placeholder="Autor" value={f.autor} onChange={(e) => setF({ ...f, autor: e.target.value })} />
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <input className={campo} placeholder="Gênero" value={f.genero} onChange={(e) => setF({ ...f, genero: e.target.value })} />
        <input className={campo} placeholder="Ano" inputMode="numeric" value={f.ano} onChange={(e) => setF({ ...f, ano: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
      </div>
      <button disabled={salvando} className="w-full rounded-full bg-amber py-2.5 text-sm font-semibold text-styx transition hover:bg-wood hover:text-foreground disabled:opacity-60">
        {salvando ? "Salvando…" : "Adicionar ao acervo"}
      </button>
    </form>
  );
}

function DialogoAluguel({ livro, onFechar, onConfirmar }: { livro: Livro; onFechar: () => void; onConfirmar: (p: string) => Promise<void> }) {
  const [pessoa, setPessoa] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-styx/80 p-4 backdrop-blur-sm" onClick={onFechar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setEnviando(true);
          await onConfirmar(pessoa);
          setEnviando(false);
        }}
        className="w-full max-w-sm space-y-4 rounded-3xl border bg-carbon p-6 shadow-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-amber uppercase">Novo aluguel</p>
            <h3 className="mt-1 text-2xl leading-tight">{livro.titulo}</h3>
            <p className="text-sm text-muted-foreground">{livro.autor}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>
        <input autoFocus className={campo} placeholder="Nome de quem está alugando" value={pessoa} onChange={(e) => setPessoa(e.target.value)} />
        <button disabled={enviando} className="w-full rounded-full bg-amber py-2.5 text-sm font-semibold text-styx disabled:opacity-60">
          {enviando ? "Registrando…" : "Confirmar aluguel"}
        </button>
      </form>
    </div>
  );
}

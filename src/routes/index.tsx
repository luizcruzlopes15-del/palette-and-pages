import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { verificarLivro } from "@/lib/catalogo.functions";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, BookMarked, Library, Plus, Search, Undo2, KeyRound, X, Trash2 } from "lucide-react";
import banner from "@/assets/banner-livros.jpg";
import { biblioteca, ErroBiblioteca, Livro } from "@/lib/biblioteca";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import domCasmurro from "@/assets/dom-casmurro.jpg.asset.json";
import horaDaEstrela from "@/assets/a-hora-da-estrela.jpg.asset.json";
import vidasSecas from "@/assets/vidas-secas.jpg.asset.json";
import livro1984 from "@/assets/1984.jpg.asset.json";
import pequenoPrincipe from "@/assets/o-pequeno-principe.jpg.asset.json";
import grandeSertao from "@/assets/grande-sertao-veredas.webp.asset.json";
import cortico from "@/assets/o-cortico.jpg.asset.json";
import cemAnos from "@/assets/cem-anos-de-solidao.webp.asset.json";

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
const capasEnviadas: Record<string, string> = {
  "dom casmurro": domCasmurro.url,
  "a hora da estrela": horaDaEstrela.url,
  "vidas secas": vidasSecas.url,
  "1984": livro1984.url,
  "o pequeno principe": pequenoPrincipe.url,
  "grande sertao veredas": grandeSertao.url,
  "o cortico": cortico.url,
  "cem anos de solidao": cemAnos.url,
};
function imagemCapa(titulo: string) {
  const chave = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return capasEnviadas[chave];
}
function capaDe(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return capas[h % capas.length];
}

function Index() {
  const verificar = useServerFn(verificarLivro);
  const [livros, setLivros] = useState<Livro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [alugando, setAlugando] = useState<Livro | null>(null);
  const [excluindo, setExcluindo] = useState<Livro | null>(null);
  const [removendo, setRemovendo] = useState(false);

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
    <div className="grain min-h-screen p-3 sm:p-4 md:p-8">
      <div className="mx-auto grid max-w-[1400px] gap-5 rounded-2xl border bg-styx/60 p-3 shadow-card sm:gap-6 sm:rounded-[2rem] sm:p-4 md:p-6 lg:grid-cols-[160px_minmax(0,1fr)_300px] xl:grid-cols-[200px_minmax(0,1fr)_340px]">
        {/* Lateral */}
        <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:flex lg:flex-col lg:items-stretch lg:justify-start">
          <div className="flex min-w-0 items-center gap-3 lg:flex-col lg:items-start lg:py-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber text-styx">
              <Library className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl leading-none">Estante</p>
              <p className="mt-1 text-xs text-muted-foreground">Acervo escolar</p>
            </div>
          </div>
          <Button size="icon" className="size-11 shrink-0 lg:hidden" aria-label="Cadastrar novo livro" title="Cadastrar novo livro" onClick={() => {
            document.getElementById("cadastro-livro")?.scrollIntoView({ block: "start", behavior: "instant" });
            document.getElementById("titulo-livro")?.focus({ preventScroll: true });
          }}><Plus /></Button>
          <nav aria-label="Filtrar acervo" className="col-span-2 grid min-w-0 grid-cols-3 gap-1 lg:flex lg:flex-col">
            {(["Todos", "Disponível", "Alugado"] as Filtro[]).map((f) => (
              <Button variant="ghost"
                key={f}
                onClick={() => setFiltro(f)}
                aria-pressed={filtro === f}
                className={`h-11 min-w-0 gap-1.5 rounded-full px-2 text-xs sm:gap-3 sm:px-4 sm:text-sm lg:justify-start ${
                  filtro === f ? "bg-amber font-semibold text-styx" : "text-muted-foreground hover:bg-carbon hover:text-foreground"
                }`}
              >
                {f === "Todos" ? <BookOpen className="size-4" /> : f === "Disponível" ? <BookMarked className="size-4" /> : <KeyRound className="size-4" />}
                <span className="truncate">{f === "Todos" ? "Acervo" : f === "Disponível" ? "Disponíveis" : "Alugados"}</span>
              </Button>
            ))}
          </nav>
          <p className="hidden text-xs leading-relaxed text-muted-foreground lg:mt-auto lg:block">
            “Uma biblioteca é um hospital para a mente.”
          </p>
        </aside>

        {/* Centro */}
        <main className="min-w-0 space-y-5 sm:space-y-7">
          <label className="flex items-center gap-3 rounded-full border bg-carbon/60 px-5 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, autor ou gênero…"
              aria-label="Buscar por título, autor ou gênero"
              className="min-w-0 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
            />
          </label>

          <section className="bg-banner relative overflow-hidden rounded-3xl border">
            <img src={banner} alt="" width={1024} height={768} className="absolute inset-y-0 right-0 h-full w-3/5 object-cover opacity-80 [mask-image:linear-gradient(to_right,transparent,black_45%)]" />
            <div className="relative max-w-md space-y-2 p-5 sm:space-y-3 sm:p-8 md:p-10">
              <p className="text-xs tracking-[0.25em] text-amber uppercase">Painel da biblioteca</p>
              <h1 className="text-2xl leading-tight sm:text-3xl md:text-4xl">
                Cada livro no seu lugar, <em className="text-amber">cada empréstimo</em> registrado.
              </h1>
              <p className="text-sm text-muted-foreground">
                {disponiveis} disponíveis · {alugados.length} alugados
              </p>
            </div>
          </section>

          <section>
            <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
              <h2 className="text-2xl">{filtro === "Todos" ? "Acervo" : filtro === "Disponível" ? "Disponíveis" : "Alugados"}</h2>
              <span className="text-xs text-muted-foreground">{visiveis.length} títulos</span>
            </div>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando acervo…</p>
            ) : visiveis.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum livro encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
                {visiveis.map((l) => (
                  <article key={l.id} className="group flex min-w-0 flex-col">
                    <div className={`relative aspect-[3/4] overflow-hidden rounded-r-xl rounded-l-sm ${capaDe(l.id)} shadow-card`}>
                      {imagemCapa(l.titulo) || l.capaUrl ? (
                        <img src={imagemCapa(l.titulo) || l.capaUrl || undefined} alt={`Capa de ${l.titulo}`} className="h-full w-full object-contain" />
                      ) : (
                      <div className="h-full p-4">
                      <span className="absolute inset-y-0 left-2 w-px bg-styx/30" />
                      <div className="flex h-full flex-col justify-between pl-2">
                        <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">{l.genero}</span>
                        <p className="font-display text-lg leading-tight break-words">{l.titulo}</p>
                        <span className="text-[11px] opacity-80">{l.autor}</span>
                      </div>
                      </div>
                      )}
                    </div>
                    <div className="mt-2 flex min-h-10 flex-wrap items-start gap-1.5">
                      <span className="rounded-md border bg-secondary px-2 py-0.5 text-[10px] break-words text-secondary-foreground">{l.genero}</span>
                      <span
                        className={`rounded-md border bg-card px-2 py-0.5 text-[10px] font-semibold ${
                          l.estaDisponivel() ? "text-success" : "text-primary"
                        }`}
                      >
                        {l.situacao}
                      </span>
                    </div>
                    <p className="mt-1 min-h-10 text-sm font-medium break-words">{l.titulo}</p>
                    <p title={`${l.autor}, ${l.ano}`} className="truncate text-xs text-muted-foreground">
                      {l.autor}, {l.ano}
                    </p>
                    <div className="mt-auto grid grid-cols-[minmax(0,1fr)_44px] gap-1 pt-3">
                    {l.estaDisponivel() ? (
                      <Button size="sm" onClick={() => setAlugando(l)} className="h-11 min-w-0 w-full px-1">
                        Alugar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm"
                        onClick={() => executar(() => biblioteca.aluguel.alugar(l.id, "—"), "")}
                        className="h-11 min-w-0 w-full px-1 text-[11px] text-muted-foreground"
                        title="Livro alugado"
                      >
                        Indisponível
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Excluir ${l.titulo}`} title={`Excluir ${l.titulo}`} onClick={() => setExcluindo(l)}><Trash2 /></Button>
                    </div>
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
        <aside className="min-w-0 space-y-6">
          <FormCadastro onSalvar={async (d) => {
            let semCapa = false;
            const ok = await executar(async () => {
              const resultado = await biblioteca.cadastro.cadastrar(d, (livro) => verificar({ data: { titulo: livro.titulo, autor: livro.autor } }));
              semCapa = resultado.semCapa;
            }, `“${d.titulo.trim()}” foi cadastrado.`);
            if (ok && semCapa && !imagemCapa(d.titulo)) setAviso({ tipo: "ok", texto: "Livro confirmado e cadastrado, mas o catálogo não tem uma capa disponível." });
            return ok;
          }} />

          <section>
            <h2 className="mb-3 text-xl">Em aluguel</h2>
            <div className="space-y-3">
              {alugados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum livro alugado.</p>}
              {alugados.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-2xl border bg-carbon/50 p-3">
                  <div className={`h-12 w-9 shrink-0 overflow-hidden rounded-sm ${capaDe(l.id)}`}>
                    {(imagemCapa(l.titulo) || l.capaUrl) && <img src={imagemCapa(l.titulo) || l.capaUrl || undefined} alt={`Capa de ${l.titulo}`} className="h-full w-full object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.locatario} · {l.alugadoEm ? new Date(l.alugadoEm).toLocaleDateString("pt-BR") : ""}
                    </p>
                  </div>
                  <Button variant="outline" size="sm"
                    onClick={() => executar(() => biblioteca.devolucao.devolver(l.id), `“${l.titulo}” foi devolvido e está disponível.`)}
                    className="h-11 shrink-0 gap-1 rounded-full px-3 text-xs hover:border-amber hover:text-amber"
                  >
                    <Undo2 className="size-3.5" /> Devolver
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <AlertDialog open={excluindo !== null} onOpenChange={(aberto) => { if (!aberto && !removendo) setExcluindo(null); }}>
        <AlertDialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">Excluir livro?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              “{excluindo?.titulo}” será removido do acervo junto com seu histórico de empréstimos. Essa ação não pode ser desfeita.
              {excluindo && !excluindo.estaDisponivel() && <span className="mt-2 block font-semibold text-destructive">Este livro está alugado para {excluindo.locatario}. O aluguel também será removido.</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={removendo} className="h-11">Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={removendo} className="h-11" onClick={async () => {
              if (!excluindo || removendo) return;
              setRemovendo(true);
              const ok = await executar(() => biblioteca.exclusao.excluir(excluindo.id), `“${excluindo.titulo}” foi excluído do acervo.`);
              setRemovendo(false);
              if (ok) setExcluindo(null);
            }}><Trash2 />{removendo ? "Excluindo…" : "Excluir livro"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          className={`fixed bottom-6 left-1/2 z-50 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border px-5 py-3 text-sm shadow-card ${
            aviso.tipo === "ok" ? "bg-carbon text-foreground" : "border-destructive bg-styx text-destructive"
          }`}
        >
          {aviso.texto}
        </div>
      )}
    </div>
  );
}

const campo = "min-w-0 w-full min-h-11 rounded-lg border bg-styx px-3 py-2.5 text-base sm:text-sm outline-none placeholder:text-muted-foreground focus:border-amber";

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
    <form id="cadastro-livro" onSubmit={enviar} className="scroll-mt-4 space-y-3 rounded-lg border bg-tea/40 p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h2 className="text-xl">Cadastrar livro</h2>
        <div className="grid size-9 place-items-center rounded-lg bg-amber text-styx">
          <Plus className="size-4" />
        </div>
      </div>
      <label className="block space-y-1 text-xs text-muted-foreground"><span>Título</span><input id="titulo-livro" className={campo} placeholder="Título" maxLength={150} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></label>
      <label className="block space-y-1 text-xs text-muted-foreground"><span>Autor</span><input className={campo} placeholder="Autor" maxLength={150} value={f.autor} onChange={(e) => setF({ ...f, autor: e.target.value })} /></label>
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <label className="min-w-0 space-y-1 text-xs text-muted-foreground"><span>Gênero</span><input className={campo} placeholder="Gênero" value={f.genero} onChange={(e) => setF({ ...f, genero: e.target.value })} /></label>
        <label className="min-w-0 space-y-1 text-xs text-muted-foreground"><span>Ano</span><input className={campo} placeholder="Ano" inputMode="numeric" value={f.ano} onChange={(e) => setF({ ...f, ano: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></label>
      </div>
      <Button disabled={salvando} className="h-11 w-full rounded-full">
        {salvando ? "Verificando livro…" : "Adicionar ao acervo"}
      </Button>
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
        role="dialog" aria-modal="true" aria-label="Novo aluguel" className="max-h-[90dvh] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg border bg-carbon p-5 shadow-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 break-words">
            <p className="text-xs tracking-[0.2em] text-amber uppercase">Novo aluguel</p>
            <h3 className="mt-1 text-2xl leading-tight">{livro.titulo}</h3>
            <p className="text-sm text-muted-foreground">{livro.autor}</p>
          </div>
          <Button variant="ghost" size="icon" type="button" onClick={onFechar} aria-label="Fechar" className="size-11 shrink-0 text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </Button>
        </div>
        <input autoFocus className={campo} placeholder="Nome de quem está alugando" value={pessoa} onChange={(e) => setPessoa(e.target.value)} />
        <Button disabled={enviando} className="h-11 w-full rounded-full">
          {enviando ? "Registrando…" : "Confirmar aluguel"}
        </Button>
      </form>
    </div>
  );
}

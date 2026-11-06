export interface RegistroCatalogo {
  title: string;
  author_name?: string[];
  cover_i?: number;
}

export function normalizarLivro(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function correspondeLivro(registro: RegistroCatalogo, titulo: string, autor: string): boolean {
  return normalizarLivro(registro.title) === normalizarLivro(titulo) &&
    (registro.author_name ?? []).some((nome) => normalizarLivro(nome) === normalizarLivro(autor));
}

export type ResultadoCatalogo = { ok: true; capaUrl: string | null } | { ok: false; erro: string };

export async function consultarCatalogo(titulo: string, autor: string, buscar: typeof fetch = fetch): Promise<ResultadoCatalogo> {
  try {
    const params = new URLSearchParams({ title: titulo, author: autor, fields: "title,author_name,cover_i", limit: "30" });
    const resposta = await buscar(`https://openlibrary.org/search.json?${params}`, { signal: AbortSignal.timeout(15000) });
    if (!resposta.ok) return { ok: false, erro: "O catálogo de livros está indisponível. Tente novamente mais tarde." };
    const dados = await resposta.json() as { docs?: RegistroCatalogo[] };
    if (!Array.isArray(dados.docs)) return { ok: false, erro: "Não foi possível consultar o catálogo. Tente novamente." };
    const encontrados = dados.docs.filter((r) => typeof r.title === "string" && correspondeLivro(r, titulo, autor));
    if (encontrados.length === 0) return { ok: false, erro: "Não encontramos esse título com esse autor no catálogo. Confira os dados; o livro não foi cadastrado." };
    const comCapa = encontrados.find((r) => Number.isSafeInteger(r.cover_i) && Number(r.cover_i) > 0);
    if (!comCapa?.cover_i) return { ok: true, capaUrl: null };
    // Confirm the cover exists, rather than displaying the provider's blank placeholder.
    const imagem = await buscar(`https://covers.openlibrary.org/b/id/${comCapa.cover_i}-L.jpg?default=false`, { signal: AbortSignal.timeout(12000) });
    if (!imagem.ok || !imagem.headers.get("content-type")?.startsWith("image/")) return { ok: true, capaUrl: null };
    return { ok: true, capaUrl: `/api/public/capas/${comCapa.cover_i}` };
  } catch {
    return { ok: false, erro: "Não foi possível verificar o livro agora. Confira sua conexão e tente novamente; nada foi cadastrado." };
  }
}
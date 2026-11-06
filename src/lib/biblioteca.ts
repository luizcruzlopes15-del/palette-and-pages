import { supabase } from "@/integrations/supabase/client";
import type { ResultadoCatalogo } from "./catalogo";

/* =========================================================
 * Sistema de Gerenciamento de Biblioteca — camada de domínio
 * Conceitos de POO usados: classes, encapsulamento (private),
 * herança (classe abstrata Operacao), composição (Biblioteca
 * reúne os serviços) e responsabilidade única (cada operação
 * — cadastro, aluguel, devolução — tem sua própria classe).
 * ========================================================= */

export type Situacao = "Disponível" | "Alugado";

export interface DadosLivro {
  titulo: string;
  autor: string;
  genero: string;
  ano: number;
}

/** Representa um exemplar do acervo. */
export class Livro {
  constructor(
    public readonly id: string,
    public readonly titulo: string,
    public readonly autor: string,
    public readonly genero: string,
    public readonly ano: number,
    private _situacao: Situacao,
    public readonly locatario: string | null,
    public readonly alugadoEm: string | null,
    public readonly capaUrl: string | null = null,
  ) {}

  get situacao(): Situacao {
    return this._situacao;
  }

  estaDisponivel(): boolean {
    return this._situacao === "Disponível";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static deLinha(l: any): Livro {
    return new Livro(l.id, l.titulo, l.autor, l.genero, l.ano, l.situacao, l.locatario, l.alugado_em, l.capa_url ?? null);
  }

  /** Regras de validação para evitar cadastros inconsistentes. */
  static validar(d: DadosLivro): string | null {
    const anoAtual = new Date().getFullYear();
    if (!d.titulo.trim()) return "Informe o título do livro.";
    if (d.titulo.trim().length > 150) return "O título deve ter no máximo 150 caracteres.";
    if (!d.autor.trim()) return "Informe o autor.";
    if (!d.genero.trim()) return "Informe o gênero.";
    if (!Number.isInteger(d.ano) || d.ano < 1000 || d.ano > anoAtual)
      return `O ano deve estar entre 1000 e ${anoAtual}.`;
    return null;
  }
}

export class ErroBiblioteca extends Error {}

/** Classe base de toda operação sobre o acervo. */
abstract class Operacao {
  protected readonly db = supabase;
  protected falhar(msg: string): never {
    throw new ErroBiblioteca(msg);
  }
}

/** Consulta e confere a situação dos exemplares. */
export class Acervo extends Operacao {
  async listar(): Promise<Livro[]> {
    const { data, error } = await this.db.from("livros").select("*").order("criado_em", { ascending: false });
    if (error) this.falhar("Não foi possível carregar o acervo.");
    return (data ?? []).map(Livro.deLinha);
  }

  /** Confere a situação de um exemplar antes de autorizar o aluguel. */
  async conferirAcervo(id: string): Promise<Livro> {
    const { data, error } = await this.db.from("livros").select("*").eq("id", id).maybeSingle();
    if (error || !data) this.falhar("Livro não encontrado no acervo.");
    return Livro.deLinha(data);
  }
}

export class ServicoCadastro extends Operacao {
  async cadastrar(d: DadosLivro, verificar: (d: DadosLivro) => Promise<ResultadoCatalogo>): Promise<{ semCapa: boolean }> {
    const erro = Livro.validar(d);
    if (erro) this.falhar(erro);
    let confirmacao: ResultadoCatalogo;
    try {
      confirmacao = await verificar(d);
    } catch {
      this.falhar("Não foi possível verificar o livro agora. Tente novamente; nada foi cadastrado.");
    }
    if (!confirmacao.ok) this.falhar(confirmacao.erro);
    const { error } = await this.db.from("livros").insert({
      titulo: d.titulo.trim(),
      autor: d.autor.trim(),
      genero: d.genero.trim(),
      ano: d.ano,
      capa_url: confirmacao.capaUrl,
    });
    if (error?.code === "23505") this.falhar("Este livro já está cadastrado no acervo.");
    if (error) this.falhar("Não foi possível cadastrar o livro.");
    return { semCapa: confirmacao.capaUrl === null };
  }
}

export class ServicoAluguel extends Operacao {
  constructor(private readonly acervo: Acervo) {
    super();
  }

  async alugar(id: string, pessoa: string): Promise<void> {
    if (!pessoa.trim()) this.falhar("Informe o nome de quem está alugando.");
    const livro = await this.acervo.conferirAcervo(id);
    if (!livro.estaDisponivel())
      this.falhar(`“${livro.titulo}” está indisponível: já foi alugado por ${livro.locatario}.`);
    // A função no banco repete a verificação de forma atômica (evita dois aluguéis simultâneos).
    const { data, error } = await this.db.rpc("alugar_livro", { p_id: id, p_pessoa: pessoa });
    if (error) this.falhar("Não foi possível registrar o aluguel.");
    if (data === "indisponivel") this.falhar(`“${livro.titulo}” está indisponível no momento.`);
  }
}

export class ServicoDevolucao extends Operacao {
  async devolver(id: string): Promise<void> {
    const { data, error } = await this.db.rpc("devolver_livro", { p_id: id });
    if (error) this.falhar("Não foi possível registrar a devolução.");
    if (data === "nao_alugado") this.falhar("Este livro não está alugado.");
  }
}

export class ServicoExclusao extends Operacao {
  async excluir(id: string): Promise<void> {
    const { data, error } = await this.db.from("livros").delete().eq("id", id).select("id");
    if (error) this.falhar("Não foi possível excluir o livro. Tente novamente.");
    if (!data?.length) this.falhar("Livro não encontrado no acervo.");
  }
}

/** Fachada que reúne todas as operações da biblioteca. */
export class Biblioteca {
  readonly acervo = new Acervo();
  readonly cadastro = new ServicoCadastro();
  readonly aluguel = new ServicoAluguel(this.acervo);
  readonly devolucao = new ServicoDevolucao();
  readonly exclusao = new ServicoExclusao();
}

export const biblioteca = new Biblioteca();

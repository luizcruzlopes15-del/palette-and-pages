import { expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { Livro, ServicoEdicao, ServicoDevolucao } from "@/lib/biblioteca";
const livro = (total: number, alugados: number) => new Livro("1", "Dom Casmurro", "Machado", "Romance", 1899, "Alugado", null, null, null, total, alugados);
it("continua disponível com 2 dos 3 exemplares alugados", () => {
  expect(livro(3, 2).quantidadeDisponivel).toBe(1);
  expect(livro(3, 2).situacao).toBe("Disponível");
});
it("fica indisponível com todos os 3 exemplares alugados", () => expect(livro(3, 3).estaDisponivel()).toBe(false));
it("não aceita quantidade zero ou fracionária", () => {
  const dados = { titulo: "Dom Casmurro", autor: "Machado", genero: "Romance", ano: 1899 };
  expect(Livro.validar({ ...dados, quantidade: 0 })).not.toBeNull();
  expect(Livro.validar({ ...dados, quantidade: 1.5 })).not.toBeNull();
});
it("edita o total de exemplares do título existente", async () => {
  rpc.mockResolvedValue({ data: "ok", error: null });
  await new ServicoEdicao().editarQuantidade("1", 3);
  expect(rpc).toHaveBeenCalledWith("editar_quantidade", { p_id: "1", p_quantidade: 3 });
});
it("não permite reduzir abaixo dos exemplares alugados", async () => {
  rpc.mockResolvedValue({ data: "abaixo_alugados", error: null });
  await expect(new ServicoEdicao().editarQuantidade("1", 1)).rejects.toThrow("menor");
});
it("devolve apenas o empréstimo selecionado", async () => {
  rpc.mockResolvedValue({ data: "ok", error: null });
  await new ServicoDevolucao().devolverExemplar("emprestimo-2");
  expect(rpc).toHaveBeenCalledWith("devolver_exemplar", { p_emprestimo_id: "emprestimo-2" });
});
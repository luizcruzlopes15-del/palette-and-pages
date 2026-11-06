import { expect, it, vi } from "vitest";
const { selecionar, filtrar } = vi.hoisted(() => ({ selecionar: vi.fn(), filtrar: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ delete: () => ({ eq: filtrar }) }) } }));
import { ServicoExclusao } from "@/lib/biblioteca";

it("exclui somente o livro escolhido", async () => {
  filtrar.mockReturnValue({ select: selecionar });
  selecionar.mockResolvedValue({ data: [{ id: "livro-escolhido" }], error: null });
  await new ServicoExclusao().excluir("livro-escolhido");
  expect(filtrar).toHaveBeenCalledWith("id", "livro-escolhido");
});
it("não informa sucesso se a exclusão falha", async () => {
  filtrar.mockReturnValue({ select: selecionar });
  selecionar.mockResolvedValue({ data: null, error: { message: "erro" } });
  await expect(new ServicoExclusao().excluir("livro-escolhido")).rejects.toThrow("Não foi possível excluir");
});
it("identifica quando o livro já não existe", async () => {
  filtrar.mockReturnValue({ select: selecionar });
  selecionar.mockResolvedValue({ data: [], error: null });
  await expect(new ServicoExclusao().excluir("livro-escolhido")).rejects.toThrow("Livro não encontrado");
});
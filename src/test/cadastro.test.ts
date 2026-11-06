import { expect, it, vi } from "vitest";
const { inserir, existentes } = vi.hoisted(() => ({
  inserir: vi.fn().mockResolvedValue({ error: null }),
  existentes: { data: [] as { titulo: string; autor: string }[] },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: inserir, select: async () => ({ data: existentes.data, error: null }) }) },
}));
import { ServicoCadastro } from "@/lib/biblioteca";

it("não grava no acervo um livro não confirmado", async () => {
  inserir.mockClear();
  existentes.data = [];
  await expect(new ServicoCadastro().cadastrar({ titulo: "Livro Inventado", autor: "Autor Inventado", genero: "Romance", ano: 2020 }, async () => ({ ok: false, erro: "Não encontrado" }))).rejects.toThrow("Não encontrado");
  expect(inserir).not.toHaveBeenCalled();
});

it("salva a capa confirmada junto com o livro real", async () => {
  inserir.mockClear();
  existentes.data = [];
  await new ServicoCadastro().cadastrar({ titulo: "Memórias Póstumas de Brás Cubas", autor: "Machado de Assis", genero: "Romance", ano: 1881 }, async () => ({ ok: true, capaUrl: "/api/public/capas/123152" }));
  expect(inserir).toHaveBeenCalledWith({ titulo: "Memórias Póstumas de Brás Cubas", autor: "Machado de Assis", genero: "Romance", ano: 1881, capa_url: "/api/public/capas/123152" });
});

it("recusa livro que já existe no acervo, mesmo com acentos e maiúsculas diferentes", async () => {
  inserir.mockClear();
  existentes.data = [{ titulo: "Dom Casmurro", autor: "Machado de Assis" }];
  const verificar = vi.fn();
  await expect(new ServicoCadastro().cadastrar({ titulo: "dom  casmurro", autor: "MACHADO DE ASSIS", genero: "Romance", ano: 1900 }, verificar)).rejects.toThrow("já existe no acervo");
  expect(verificar).not.toHaveBeenCalled();
  expect(inserir).not.toHaveBeenCalled();
});

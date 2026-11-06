import { expect, it, vi } from "vitest";
const { inserir } = vi.hoisted(() => ({ inserir: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: inserir }) } }));
import { ServicoCadastro } from "@/lib/biblioteca";

it("não grava no acervo um livro não confirmado", async () => {
  inserir.mockClear();
  await expect(new ServicoCadastro().cadastrar({ titulo: "Livro Inventado", autor: "Autor Inventado", genero: "Romance", ano: 2020 }, async () => ({ ok: false, erro: "Não encontrado" }))).rejects.toThrow("Não encontrado");
  expect(inserir).not.toHaveBeenCalled();
});

it("salva a capa confirmada junto com o livro real", async () => {
  inserir.mockClear();
  await new ServicoCadastro().cadastrar({ titulo: "Memórias Póstumas de Brás Cubas", autor: "Machado de Assis", genero: "Romance", ano: 1881 }, async () => ({ ok: true, capaUrl: "/api/public/capas/123152" }));
  expect(inserir).toHaveBeenCalledWith({ titulo: "Memórias Póstumas de Brás Cubas", autor: "Machado de Assis", genero: "Romance", ano: 1881, capa_url: "/api/public/capas/123152" });
});
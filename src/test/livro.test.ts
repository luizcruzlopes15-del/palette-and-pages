import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { Livro } from "@/lib/biblioteca";

const ok = { titulo: "Dom Casmurro", autor: "Machado", genero: "Romance", ano: 1899 };

describe("Livro", () => {
  it("aceita um cadastro válido", () => expect(Livro.validar(ok)).toBeNull());
  it("rejeita título vazio", () => expect(Livro.validar({ ...ok, titulo: "  " })).not.toBeNull());
  it("rejeita ano no futuro", () => expect(Livro.validar({ ...ok, ano: 3000 })).not.toBeNull());
  it("livro alugado não está disponível", () => {
    expect(new Livro("1", "a", "b", "c", 2000, "Alugado", "Ana", null).estaDisponivel()).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { consultarCatalogo, correspondeLivro } from "@/lib/catalogo";

describe("Confirmação bibliográfica", () => {
  it("confirma título e autor reais apesar de acentos e capitalização", () => {
    expect(correspondeLivro({ title: "Memórias póstumas de Brás Cubas", author_name: ["Machado de Assis"] }, "Memorias Postumas de Bras Cubas", "Machado de Assis")).toBe(true);
  });
  it("rejeita um autor diferente para um título conhecido", () => {
    expect(correspondeLivro({ title: "Dom Casmurro", author_name: ["Machado de Assis"] }, "Dom Casmurro", "Autor Inventado")).toBe(false);
  });
  it("rejeita um livro inventado sem resultados", async () => {
    const buscar = vi.fn().mockResolvedValue(new Response(JSON.stringify({ docs: [] })));
    expect((await consultarCatalogo("O Planeta de Abacaxis Zyx987", "Autor Inventado", buscar)).ok).toBe(false);
  });
  it("bloqueia a confirmação quando o catálogo falha", async () => {
    const buscar = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    expect((await consultarCatalogo("Dom Casmurro", "Machado de Assis", buscar)).ok).toBe(false);
  });
  it("retorna uma capa real por um endereço da própria estante", async () => {
    const buscar = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ docs: [{ title: "Dom Casmurro", author_name: ["Machado de Assis"], cover_i: 123152 }] })))
      .mockResolvedValueOnce(new Response("image", { headers: { "content-type": "image/jpeg" } }));
    expect(await consultarCatalogo("Dom Casmurro", "Machado de Assis", buscar)).toEqual({ ok: true, capaUrl: "/api/public/capas/123152" });
  });
  it("confirma um livro sem capa sem inventar uma imagem", async () => {
    const buscar = vi.fn().mockResolvedValue(new Response(JSON.stringify({ docs: [{ title: "Dom Casmurro", author_name: ["Machado de Assis"] }] })));
    expect(await consultarCatalogo("Dom Casmurro", "Machado de Assis", buscar)).toEqual({ ok: true, capaUrl: null });
  });
});
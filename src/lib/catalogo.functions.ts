import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { consultarCatalogo } from "./catalogo";

export const verificarLivro = createServerFn({ method: "POST" })
  .inputValidator((entrada) => z.object({
    titulo: z.string().trim().min(1).max(150),
    autor: z.string().trim().min(1).max(150),
  }).parse(entrada))
  .handler(async ({ data }) => consultarCatalogo(data.titulo, data.autor));
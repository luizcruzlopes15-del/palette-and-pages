import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Livro } from "@/lib/biblioteca";

export function EditarLivro({ livro, onFechar, onSalvar }: { livro: Livro; onFechar: () => void; onSalvar: (quantidade: number) => Promise<boolean> }) {
  const [quantidade, setQuantidade] = useState(String(livro.quantidade));
  const [salvando, setSalvando] = useState(false);
  return <Dialog open onOpenChange={(open) => { if (!open && !salvando) onFechar(); }}>
    <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-lg [&>button]:hidden">
      <DialogHeader>
        <div className="flex items-center justify-between gap-3">
          <DialogTitle className="flex items-center gap-2"><Pencil className="size-4" />Editar livro</DialogTitle>
          <Button variant="ghost" size="icon" aria-label="Fechar edição" onClick={onFechar} disabled={salvando} className="size-11"><X /></Button>
        </div>
        <DialogDescription className="break-words">{livro.titulo} · {livro.autor}</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        setSalvando(true);
        const ok = await onSalvar(Number(quantidade));
        setSalvando(false);
        if (ok) onFechar();
      }}>
        <label className="block space-y-2 text-sm">Quantidade de exemplares
          <input autoFocus type="number" min={Math.max(1, livro.quantidadeAlugada)} step={1} required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="min-h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus:border-primary" />
        </label>
        <p className="text-sm text-muted-foreground">{livro.quantidadeAlugada} alugados · {livro.quantidadeDisponivel} disponíveis atualmente</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onFechar} disabled={salvando} className="h-11">Cancelar</Button>
          <Button disabled={salvando} className="h-11"><Save />{salvando ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
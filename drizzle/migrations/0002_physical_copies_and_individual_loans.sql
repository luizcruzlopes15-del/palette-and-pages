ALTER TABLE public.livros ADD COLUMN quantidade integer NOT NULL DEFAULT 1, ADD COLUMN quantidade_alugada integer NOT NULL DEFAULT 0;
CREATE TABLE public.emprestimos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), livro_id uuid NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE, pessoa text NOT NULL CHECK (length(trim(pessoa)) > 0), alugado_em timestamptz NOT NULL DEFAULT now(), devolvido_em timestamptz);
GRANT SELECT ON public.emprestimos TO anon, authenticated;
GRANT ALL ON public.emprestimos TO service_role;
ALTER TABLE public.emprestimos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emprestimos leitura publica" ON public.emprestimos FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX emprestimos_ativos_livro ON public.emprestimos(livro_id) WHERE devolvido_em IS NULL;
INSERT INTO public.emprestimos(livro_id,pessoa,alugado_em) SELECT id,coalesce(nullif(trim(locatario),''),'Não informado'),coalesce(alugado_em,now()) FROM public.livros WHERE situacao='Alugado';
UPDATE public.livros SET quantidade_alugada=1 WHERE situacao='Alugado';
ALTER TABLE public.livros ADD CONSTRAINT quantidade_positiva CHECK (quantidade >= 1), ADD CONSTRAINT capacidade_exemplares CHECK (quantidade_alugada >= 0 AND quantidade_alugada <= quantidade);
CREATE OR REPLACE FUNCTION public.alugar_livro(p_id uuid,p_pessoa text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_pessoa IS NULL OR length(trim(p_pessoa))=0 THEN RETURN 'sem_nome'; END IF;
 UPDATE public.livros SET quantidade_alugada=quantidade_alugada+1, situacao=CASE WHEN quantidade_alugada+1 >= quantidade THEN 'Alugado' ELSE 'Disponível' END, locatario=trim(p_pessoa), alugado_em=now() WHERE id=p_id AND quantidade_alugada < quantidade;
 IF NOT FOUND THEN RETURN 'indisponivel'; END IF;
 INSERT INTO public.emprestimos(livro_id,pessoa) VALUES(p_id,trim(p_pessoa));
 INSERT INTO public.historico(livro_id,tipo,pessoa) VALUES(p_id,'aluguel',trim(p_pessoa));
 RETURN 'ok';
END $$;
CREATE FUNCTION public.devolver_exemplar(p_emprestimo_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE livro uuid; nome text;
BEGIN
 SELECT livro_id INTO livro FROM public.emprestimos WHERE id=p_emprestimo_id;
 IF livro IS NULL THEN RETURN 'nao_alugado'; END IF;
 PERFORM 1 FROM public.livros WHERE id=livro FOR UPDATE;
 UPDATE public.emprestimos SET devolvido_em=now() WHERE id=p_emprestimo_id AND devolvido_em IS NULL RETURNING pessoa INTO nome;
 IF NOT FOUND THEN RETURN 'nao_alugado'; END IF;
 UPDATE public.livros SET quantidade_alugada=quantidade_alugada-1,situacao='Disponível',locatario=(SELECT pessoa FROM public.emprestimos WHERE livro_id=livro AND devolvido_em IS NULL ORDER BY alugado_em LIMIT 1),alugado_em=(SELECT e.alugado_em FROM public.emprestimos e WHERE livro_id=livro AND devolvido_em IS NULL ORDER BY e.alugado_em LIMIT 1) WHERE id=livro;
 INSERT INTO public.historico(livro_id,tipo,pessoa) VALUES(livro,'devolucao',nome);
 RETURN 'ok';
END $$;
CREATE OR REPLACE FUNCTION public.devolver_livro(p_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE emprestimo uuid;
BEGIN
 PERFORM 1 FROM public.livros WHERE id=p_id FOR UPDATE;
 SELECT id INTO emprestimo FROM public.emprestimos WHERE livro_id=p_id AND devolvido_em IS NULL ORDER BY alugado_em,id LIMIT 1;
 IF emprestimo IS NULL THEN RETURN 'nao_alugado'; END IF;
 RETURN public.devolver_exemplar(emprestimo);
END $$;
CREATE FUNCTION public.editar_quantidade(p_id uuid,p_quantidade integer) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE alugadas integer;
BEGIN
 IF p_quantidade IS NULL OR p_quantidade < 1 THEN RETURN 'quantidade_invalida'; END IF;
 SELECT quantidade_alugada INTO alugadas FROM public.livros WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
 IF p_quantidade < alugadas THEN RETURN 'abaixo_alugados'; END IF;
 UPDATE public.livros SET quantidade=p_quantidade,situacao=CASE WHEN alugadas >= p_quantidade THEN 'Alugado' ELSE 'Disponível' END WHERE id=p_id;
 RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.alugar_livro(uuid,text), public.devolver_livro(uuid), public.devolver_exemplar(uuid), public.editar_quantidade(uuid,integer) TO anon, authenticated, service_role;
COMMENT ON COLUMN public.livros.locatario IS 'Legacy summary; individual borrowers are stored in public.emprestimos.';
COMMENT ON COLUMN public.livros.alugado_em IS 'Legacy summary; individual loan dates are stored in public.emprestimos.';
CREATE TABLE public.livros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (length(trim(titulo)) > 0),
  autor text NOT NULL CHECK (length(trim(autor)) > 0),
  genero text NOT NULL CHECK (length(trim(genero)) > 0),
  ano integer NOT NULL CHECK (ano BETWEEN 1000 AND 2100),
  situacao text NOT NULL DEFAULT 'Disponível' CHECK (situacao IN ('Disponível','Alugado')),
  locatario text,
  alugado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (titulo, autor, ano)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livros TO anon, authenticated;
GRANT ALL ON public.livros TO service_role;
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acervo publico leitura" ON public.livros FOR SELECT USING (true);
CREATE POLICY "acervo publico insercao" ON public.livros FOR INSERT WITH CHECK (true);
CREATE POLICY "acervo publico atualizacao" ON public.livros FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "acervo publico remocao" ON public.livros FOR DELETE USING (true);

CREATE TABLE public.historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id uuid NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('aluguel','devolucao')),
  pessoa text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.historico TO anon, authenticated;
GRANT ALL ON public.historico TO service_role;
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historico leitura" ON public.historico FOR SELECT USING (true);
CREATE POLICY "historico insercao" ON public.historico FOR INSERT WITH CHECK (true);

-- Aluguel atômico: impede alugar livro já alugado
CREATE OR REPLACE FUNCTION public.alugar_livro(p_id uuid, p_pessoa text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF p_pessoa IS NULL OR length(trim(p_pessoa)) = 0 THEN RETURN 'sem_nome'; END IF;
  UPDATE livros SET situacao='Alugado', locatario=trim(p_pessoa), alugado_em=now()
   WHERE id=p_id AND situacao='Disponível';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RETURN 'indisponivel'; END IF;
  INSERT INTO historico(livro_id,tipo,pessoa) VALUES (p_id,'aluguel',trim(p_pessoa));
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.devolver_livro(p_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pess text;
BEGIN
  UPDATE livros SET situacao='Disponível', locatario=NULL, alugado_em=NULL
   WHERE id=p_id AND situacao='Alugado' RETURNING locatario INTO pess;
  IF NOT FOUND THEN RETURN 'nao_alugado'; END IF;
  INSERT INTO historico(livro_id,tipo,pessoa) VALUES (p_id,'devolucao',NULL);
  RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.alugar_livro(uuid,text), public.devolver_livro(uuid) TO anon, authenticated;

INSERT INTO public.livros (titulo,autor,genero,ano,situacao,locatario,alugado_em) VALUES
('Dom Casmurro','Machado de Assis','Romance',1899,'Disponível',NULL,NULL),
('Grande Sertão: Veredas','João Guimarães Rosa','Romance',1956,'Alugado','Marina Souza',now() - interval '3 days'),
('A Hora da Estrela','Clarice Lispector','Romance',1977,'Disponível',NULL,NULL),
('Vidas Secas','Graciliano Ramos','Romance',1938,'Disponível',NULL,NULL),
('O Cortiço','Aluísio Azevedo','Naturalismo',1890,'Alugado','Pedro Lima',now() - interval '1 day'),
('1984','George Orwell','Distopia',1949,'Disponível',NULL,NULL),
('O Pequeno Príncipe','Antoine de Saint-Exupéry','Fábula',1943,'Disponível',NULL,NULL),
('Cem Anos de Solidão','Gabriel García Márquez','Realismo Mágico',1967,'Disponível',NULL,NULL);
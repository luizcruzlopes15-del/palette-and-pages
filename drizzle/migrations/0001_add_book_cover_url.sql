ALTER TABLE public.livros ADD COLUMN capa_url text;
COMMENT ON COLUMN public.livros.capa_url IS 'Cover URL found in a bibliographic catalog during book registration';
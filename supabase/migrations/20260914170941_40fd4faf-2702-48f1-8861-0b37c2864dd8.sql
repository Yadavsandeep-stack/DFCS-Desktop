CREATE TYPE public.access_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status public.access_status NOT NULL DEFAULT 'pending',
  download_count INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  os TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v2.4.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX downloads_created_at_idx ON public.downloads (created_at);

GRANT ALL ON public.access_requests TO service_role;
GRANT ALL ON public.downloads TO service_role;

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

INSERT INTO public.access_requests (full_name, email, status, download_count, last_login_at, approved_at, created_at) VALUES
  ('Aarav Mehta','aarav.mehta@example.com','approved',4, now() - interval '2 hours', now() - interval '9 days', now() - interval '10 days'),
  ('Sofia Rossi','sofia.rossi@example.com','approved',2, now() - interval '1 day', now() - interval '6 days', now() - interval '7 days'),
  ('Liam Chen','liam.chen@example.com','approved',7, now() - interval '5 hours', now() - interval '4 days', now() - interval '5 days'),
  ('Nadia Haddad','nadia.haddad@example.com','pending',0, NULL, NULL, now() - interval '2 days'),
  ('Tom Weber','tom.weber@example.com','pending',0, NULL, NULL, now() - interval '8 hours');

INSERT INTO public.downloads (email, os, created_at)
SELECT
  (ARRAY['aarav.mehta@example.com','sofia.rossi@example.com','liam.chen@example.com'])[1 + (i % 3)],
  (ARRAY['windows','macos','linux'])[1 + (i % 3)],
  now() - ((i % 14) || ' days')::interval
FROM generate_series(1, 42) AS s(i);
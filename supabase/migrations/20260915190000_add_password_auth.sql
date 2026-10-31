ALTER TABLE public.access_requests
  ADD COLUMN password_hash TEXT,
  ADD COLUMN password_salt TEXT;
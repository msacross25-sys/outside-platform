-- Lock OUTSiiDE's public Postgres schema to server-side Prisma access.
-- Supabase's anon/authenticated roles are revoked when those roles exist.
-- Plain PostgreSQL environments (local/CI) still apply RLS without failing.

DO $$
DECLARE
  r record;
  role_name text;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);

    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format(
          'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
          r.tablename,
          role_name
        );
      END IF;
    END LOOP;
  END LOOP;
END
$$;

DO $$
DECLARE
  r record;
  role_name text;
BEGIN
  FOR r IN
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
  LOOP
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format(
          'REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM %I',
          r.sequencename,
          role_name
        );
      END IF;
    END LOOP;
  END LOOP;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL PRIVILEGES ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL PRIVILEGES ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL PRIVILEGES ON SEQUENCES FROM authenticated;
  END IF;
END
$$;

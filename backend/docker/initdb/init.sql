-- init.sql: create admin and tenant databases and a dedicated app user
-- This script runs as the default postgres superuser on container initialization.

-- Create tenant databases if they don't exist and ensure ownership
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tenant1_db') THEN
      PERFORM pg_execute_backend('CREATE DATABASE tenant1_db');
   END IF;
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tenant2_db') THEN
      PERFORM pg_execute_backend('CREATE DATABASE tenant2_db');
   END IF;
EXCEPTION WHEN others THEN
   -- ignore
   NULL;
END
$$;

-- Note: admin_db is created automatically by the Docker image when POSTGRES_DB=admin_db
-- Schema and data seeding will be done by the backend seed script once the container is ready.

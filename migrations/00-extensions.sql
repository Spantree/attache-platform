-- Required Postgres extensions for Attaché
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector: embedding storage & similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram: fuzzy text matching

-- Indexation pour recherche texte rapide (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "products_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_description_trgm_idx" ON "products" USING gin ((COALESCE(description, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_technical_specs_trgm_idx" ON "products" USING gin ((COALESCE("technicalSpecs", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_category_available_priority_idx"
  ON "products" ("categoryId", "isAvailable" DESC, "priorityOrder" ASC);

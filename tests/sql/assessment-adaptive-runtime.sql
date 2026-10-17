\set ON_ERROR_STOP on
-- Fictional local-only runtime checks; the complete transaction is rolled back.
\set assessment_adaptive_route_tests true
\set assessment_adaptive_runtime_tests true
\ir assessment-engine.sql

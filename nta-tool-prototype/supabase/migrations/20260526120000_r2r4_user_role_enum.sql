-- Step 1: enum value must be committed before use in policies (Postgres 55P04).
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'R2R4';

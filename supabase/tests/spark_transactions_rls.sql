-- ============================================================
-- DayTwin — Acceptance test: spark_transactions client INSERT is blocked
--
-- Run in Supabase SQL Editor as a signed-in authenticated user
-- (not with the service_role key).
--
-- Expected result: the INSERT raises an RLS violation error,
-- proving no client can write Sparks directly.
-- ============================================================

-- Step 1: Confirm RLS is enabled on spark_transactions.
SELECT relrowsecurity
FROM pg_class
WHERE oid = 'public.spark_transactions'::regclass;
-- Expected: true

-- Step 2: List existing policies on the table.
-- Expected: only the SELECT policy exists — no INSERT policy.
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'spark_transactions'
  AND schemaname = 'public'
ORDER BY cmd;

-- Step 3: Attempt a direct client INSERT.
-- This MUST fail with: "new row violates row-level security policy"
-- Run this while connected as an authenticated user (anon key, not service key).
DO $$
DECLARE
  test_user_id uuid := auth.uid();
BEGIN
  INSERT INTO public.spark_transactions (user_id, amount, reason)
  VALUES (test_user_id, 100, 'rls_test_should_fail');

  -- If we reach this line, the test FAILED — RLS is not blocking inserts.
  RAISE EXCEPTION 'TEST FAILED: INSERT into spark_transactions succeeded when it should have been blocked by RLS.';

EXCEPTION
  WHEN others THEN
    IF sqlerrm LIKE '%row-level security%' OR sqlerrm LIKE '%violates%' THEN
      RAISE NOTICE 'TEST PASSED: INSERT correctly blocked by RLS. Error: %', sqlerrm;
    ELSE
      RAISE EXCEPTION 'TEST FAILED with unexpected error: %', sqlerrm;
    END IF;
END;
$$;

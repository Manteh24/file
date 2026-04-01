-- Change Subscription.plan default from PRO to FREE
-- All new registrations start on the FREE plan; PRO trial is activated post-login via TrialActivationBanner
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'FREE'::"Plan";

-- Change Subscription.isTrial default from true to false
-- Matches the new registration flow where isTrial starts false
ALTER TABLE "subscriptions" ALTER COLUMN "isTrial" SET DEFAULT false;

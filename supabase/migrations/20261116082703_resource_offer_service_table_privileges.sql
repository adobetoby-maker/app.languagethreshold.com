-- Resource offer writes must pass through the durable definer RPCs.
revoke all on public.resource_offer_claims from service_role;
grant select on public.resource_offer_claims to service_role;

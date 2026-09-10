begin;

-- A deployment with historical rows must add reviewed, row-explicit reconciliation
-- before this guard. Never infer identities or revoke rows as a generic fallback.
do $gate$
begin
  if exists(select 1 from drs_forward_private.reviewer_registration_operation_grants
    where not legacy_identity_unresolved
      and (specialist_id is null or auth_binding_id is null or auth_binding_version is null)) then
    raise exception 'LEGACY_GRANT_RECONCILIATION_REQUIRED' using errcode='55000';
  end if;
end $gate$;

commit;

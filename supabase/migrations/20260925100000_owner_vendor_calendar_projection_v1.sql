begin;

create or replace function public.owner_vendor_google_calendar_projection_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_case_id uuid;
  v_owner_membership_count integer;
  v_vendor_count integer;
  v_binding_count integer;
  v_binding integration.vendor_google_calendar_bindings%rowtype;
  v_credential integration.vendor_google_calendar_credentials%rowtype;
  v_selections jsonb;
begin
  if current_setting('role', true) is distinct from 'service_role'
     or p_authenticated_user_id is null
     or p_expected_case_id is null then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'authority_denied'
    );
  end if;

  select selected.case_id
  into v_current_case_id
  from casework.user_current_cases selected
  join casework.cases c
    on c.id = selected.case_id
   and c.case_status = 'active'
  join auth.users u
    on u.id = selected.user_id
   and u.deleted_at is null
   and (u.banned_until is null or u.banned_until <= pg_catalog.clock_timestamp())
  where selected.user_id = p_authenticated_user_id;

  if not found or v_current_case_id is distinct from p_expected_case_id then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'authority_denied'
    );
  end if;

  select pg_catalog.count(*)
  into v_owner_membership_count
  from casework.case_members owner_membership
  where owner_membership.case_id = p_expected_case_id
    and owner_membership.user_id = p_authenticated_user_id
    and owner_membership.role = 'owner';

  if v_owner_membership_count is distinct from 1 then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'authority_denied'
    );
  end if;

  select
    pg_catalog.count(distinct binding.user_id),
    pg_catalog.count(distinct binding.id)
  into v_vendor_count, v_binding_count
  from integration.vendor_google_calendar_bindings binding
  join casework.case_members vendor_membership
    on vendor_membership.case_id = binding.case_id
   and vendor_membership.user_id = binding.user_id
   and vendor_membership.role = 'pro'
  join integration.vendor_google_calendar_credentials credential
    on credential.id = binding.credential_id
   and credential.user_id = binding.user_id
   and credential.google_subject = binding.google_subject
  where binding.case_id = p_expected_case_id
    and binding.account_role = 'pro'
    and binding.binding_status = 'active'
    and binding.sharing_revision > 0
    and binding.credential_domain is not null
    and binding.credential_domain is not distinct from credential.client_domain
    and credential.credential_status = 'active'
    and credential.credential_generation > 0
    and credential.encrypted_credential like 'v2.%'
    and credential.granted_scopes && array[
      'https://www.googleapis.com/auth/calendar.events.owned',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.readonly'
    ]::text[]
    and exists (
      select 1
      from integration.vendor_google_calendar_selections selection
      where selection.binding_id = binding.id
        and selection.user_id = binding.user_id
        and selection.case_id = binding.case_id
        and selection.active is true
        and selection.share_mode in (
          'busy_only',
          'availability_only',
          'title_time'
        )
    );

  if v_vendor_count = 0 or v_binding_count = 0 then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'state', 'not_shared',
      'case_id', p_expected_case_id
    );
  end if;

  if v_vendor_count is distinct from 1 or v_binding_count is distinct from 1 then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'temporarily_unavailable'
    );
  end if;

  select binding.*
  into v_binding
  from integration.vendor_google_calendar_bindings binding
  join casework.case_members vendor_membership
    on vendor_membership.case_id = binding.case_id
   and vendor_membership.user_id = binding.user_id
   and vendor_membership.role = 'pro'
  join integration.vendor_google_calendar_credentials credential
    on credential.id = binding.credential_id
   and credential.user_id = binding.user_id
   and credential.google_subject = binding.google_subject
  where binding.case_id = p_expected_case_id
    and binding.account_role = 'pro'
    and binding.binding_status = 'active'
    and binding.sharing_revision > 0
    and binding.credential_domain is not null
    and binding.credential_domain is not distinct from credential.client_domain
    and credential.credential_status = 'active'
    and credential.credential_generation > 0
    and credential.encrypted_credential like 'v2.%'
    and credential.granted_scopes && array[
      'https://www.googleapis.com/auth/calendar.events.owned',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.readonly'
    ]::text[]
  limit 1;

  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'temporarily_unavailable'
    );
  end if;

  select credential.*
  into v_credential
  from integration.vendor_google_calendar_credentials credential
  where credential.id = v_binding.credential_id
    and credential.user_id = v_binding.user_id
    and credential.google_subject = v_binding.google_subject
    and credential.client_domain is not distinct from v_binding.credential_domain
    and credential.credential_status = 'active'
    and credential.credential_generation > 0
    and credential.encrypted_credential like 'v2.%'
    and credential.granted_scopes && array[
      'https://www.googleapis.com/auth/calendar.events.owned',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.readonly'
    ]::text[]
  limit 1;

  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'temporarily_unavailable'
    );
  end if;

  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'selection_ref', selection.selection_ref,
      'calendar_id', selection.calendar_id,
      'share_mode', case
        when selection.share_mode = 'busy_only' then 'availability_only'
        else selection.share_mode
      end
    )
    order by selection.selection_ref
  )
  into v_selections
  from integration.vendor_google_calendar_selections selection
  where selection.binding_id = v_binding.id
    and selection.user_id = v_binding.user_id
    and selection.case_id = v_binding.case_id
    and selection.active is true
    and selection.share_mode in (
      'busy_only',
      'availability_only',
      'title_time'
    );

  if v_selections is null or pg_catalog.jsonb_array_length(v_selections) = 0 then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'state', 'not_shared',
      'case_id', p_expected_case_id
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'state', 'ready',
    'case_id', p_expected_case_id,
    'vendor_user_id', v_binding.user_id,
    'binding_id', v_binding.id,
    'binding_ref', v_binding.binding_ref,
    'sharing_revision', v_binding.sharing_revision,
    'credential_id', v_credential.id,
    'credential_generation', v_credential.credential_generation,
    'credential_domain', v_credential.client_domain,
    'google_subject', v_credential.google_subject,
    'encrypted_credential', v_credential.encrypted_credential,
    'token_expires_at', v_credential.token_expires_at,
    'granted_scopes', v_credential.granted_scopes,
    'selections', v_selections
  );
exception
  when others then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', 'temporarily_unavailable'
    );
end;
$$;

alter function public.owner_vendor_google_calendar_projection_v1(uuid, uuid)
  owner to postgres;

revoke all on function public.owner_vendor_google_calendar_projection_v1(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.owner_vendor_google_calendar_projection_v1(uuid, uuid)
  to service_role;

commit;

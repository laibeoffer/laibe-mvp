-- Based on the live vendor dispatch definition (SHA-256 92ccaa7f338d26cdab4c6675cb70b3546ddfa308360332fffe4dfd5685e890af).
-- Existing legacy selections remain stored for audit but cannot remain active.
begin;

alter table integration.vendor_google_calendar_selections
  drop constraint vendor_google_calendar_selections_share_mode_check;
alter table integration.vendor_google_calendar_selections
  add constraint vendor_google_calendar_selections_share_mode_check
  check (share_mode in ('busy_only', 'title_time', 'full_detail'));
update integration.vendor_google_calendar_selections
set active = false
where active is true and share_mode <> 'full_detail';
create unique index if not exists vendor_google_calendar_one_active_selection_per_binding
  on integration.vendor_google_calendar_selections (binding_id)
  where active is true;

CREATE OR REPLACE FUNCTION public.vendor_google_calendar_dispatch_v2(p_action text, p_user_id uuid, p_session_id uuid, p_case_id uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_context jsonb;
  v_flow integration.vendor_google_calendar_flows%rowtype;
  v_binding integration.vendor_google_calendar_bindings%rowtype;
  v_credential integration.vendor_google_calendar_credentials%rowtype;
  v_choice integration.vendor_google_calendar_choices%rowtype;
  v_id uuid;
  v_subject text;
  v_subject_count integer;
  v_domain text:=p_input->>'client_domain';
  v_scopes text[];
  v_item jsonb;
  v_previous jsonb;
  v_next jsonb;
  v_count integer;
  v_anchor text;
  v_revision bigint;
  v_generation bigint;
  v_expected_scopes constant text[]:=array['openid','https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events.owned.readonly'];
begin
  if current_setting('role',true) is distinct from 'service_role' or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>1048576 then
    return pg_catalog.jsonb_build_object('ok',false,'state','sign_in_required');
  end if;
  if p_action='callback_claim' then
    select * into v_flow from integration.vendor_google_calendar_flows where state_digest=p_input->>'state_digest' for update;
    if not found then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
    p_user_id:=v_flow.user_id; p_session_id:=v_flow.auth_session_id; p_case_id:=v_flow.case_id;
  elsif p_action in ('callback_complete','callback_check','callback_subject') then
    select * into v_flow from integration.vendor_google_calendar_flows where id=(p_input->>'flow_ref')::uuid for update;
    if not found then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
    p_user_id:=v_flow.user_id; p_session_id:=v_flow.auth_session_id; p_case_id:=v_flow.case_id;
  end if;
  v_context:=integration.vendor_calendar_context_v2(p_user_id,p_session_id,p_case_id);
  if v_context->'ok' is distinct from 'true'::jsonb then return v_context; end if;
  if p_action='context' then return v_context; end if;
  if v_domain is null or length(v_domain)<>43 then return pg_catalog.jsonb_build_object('ok',false,'state','setup_unavailable'); end if;

  if p_action='start' then
    select min(i.provider_id),count(*) into v_subject,v_subject_count from auth.identities i
      where i.user_id=p_user_id and i.provider='google' and nullif(i.provider_id,'') is not null;
    if v_subject_count>1 then return pg_catalog.jsonb_build_object('ok',false,'state','case_not_authorized'); end if;
    select * into v_binding from integration.vendor_google_calendar_bindings where user_id=p_user_id and case_id=p_case_id and account_role='pro' for update;
    if found then
      if (p_input->>'binding_ref')::uuid is distinct from v_binding.binding_ref or
         (p_input->>'expected_sharing_revision')::bigint is distinct from v_binding.sharing_revision then
        return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict');
      end if;
      if v_subject is not null and v_subject<>v_binding.google_subject then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
      v_subject:=v_binding.google_subject;
    elsif p_input ? 'binding_ref' or coalesce((p_input->>'expected_sharing_revision')::bigint,0)<>0 then
      return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict');
    end if;
    if v_subject is not null then
      select * into v_credential from integration.vendor_google_calendar_credentials where user_id=p_user_id and google_subject=v_subject for share;
    end if;
    v_context:=integration.vendor_calendar_context_v2(p_user_id,p_session_id,p_case_id);
    if v_context->'ok' is distinct from 'true'::jsonb then return v_context; end if;
    if coalesce(length(p_input->>'state_digest'),0)<>43 or coalesce(length(p_input->>'initiation_digest'),0)<>43 or
      coalesce(p_input->>'sealed_verifier','') not like 'v2.%' then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
    insert into integration.vendor_google_calendar_flows(id,user_id,auth_session_id,case_id,client_domain,state_digest,initiation_digest,
      expected_google_subject,expected_binding_id,expected_sharing_revision,expected_credential_id,expected_credential_generation,expected_credential_domain,sealed_verifier,expires_at)
    values((p_input->>'flow_ref')::uuid,p_user_id,p_session_id,p_case_id,v_domain,p_input->>'state_digest',p_input->>'initiation_digest',
      v_subject,v_binding.id,coalesce(v_binding.sharing_revision,0),v_credential.id,coalesce(v_credential.credential_generation,0),v_credential.client_domain,p_input->>'sealed_verifier',(p_input->>'expires_at')::timestamptz)
    returning * into v_flow;
    perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,v_flow.expires_at);
    return pg_catalog.jsonb_build_object('ok',true,'flow_ref',v_flow.id,'flow_revision',v_flow.flow_revision,'expires_at',v_flow.expires_at);
  end if;

  if p_action in ('callback_claim','callback_complete','callback_check','callback_subject','finish','flow_read','choices_store','save','cancel_pending') then
    if p_action not in ('callback_claim','callback_complete','callback_check','callback_subject') then
      select * into v_flow from integration.vendor_google_calendar_flows where id=(p_input->>'flow_ref')::uuid and user_id=p_user_id and case_id=p_case_id for update;
      if not found then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
    end if;
    if v_flow.user_id<>p_user_id or v_flow.auth_session_id<>p_session_id or v_flow.case_id<>p_case_id or v_flow.client_domain<>v_domain then
      return pg_catalog.jsonb_build_object('ok',false,'state','session_changed');
    end if;
    v_context:=integration.vendor_calendar_context_v2(p_user_id,p_session_id,p_case_id);
    if v_context->'ok' is distinct from 'true'::jsonb then return v_context; end if;
    if v_flow.stage in ('saved','cancelled','expired') then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
    if v_flow.expires_at<=clock_timestamp() then
      perform integration.vendor_calendar_retire_flow_v2(v_flow.id,'expired');
      return pg_catalog.jsonb_build_object('ok',false,'state','flow_expired');
    end if;
    if p_action<>'callback_claim' and (p_input->>'flow_revision')::bigint is distinct from v_flow.flow_revision then
      return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict');
    end if;
    if p_action not in ('callback_claim','callback_complete','callback_check','callback_subject') and p_input->>'initiation_digest' is distinct from v_flow.initiation_digest then
      if v_flow.failed_proofs>=8 then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid','rate_limited',true); end if;
      update integration.vendor_google_calendar_flows set failed_proofs=least(failed_proofs+1,1000000) where id=v_flow.id;
      return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid');
    end if;
    if p_action='cancel_pending' then
      perform integration.vendor_calendar_retire_flow_v2(v_flow.id,'cancelled');
      return pg_catalog.jsonb_build_object('ok',true,'state','cancelled','flow_ref',v_flow.id,'flow_revision',v_flow.flow_revision+1);
    end if;
    select * into v_binding from integration.vendor_google_calendar_bindings where user_id=p_user_id and case_id=p_case_id and account_role='pro' for update;
    if v_binding.id is distinct from v_flow.expected_binding_id or coalesce(v_binding.sharing_revision,0)<>v_flow.expected_sharing_revision then
      return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict');
    end if;
    if v_flow.expected_credential_id is not null then
      select * into v_credential from integration.vendor_google_calendar_credentials where id=v_flow.expected_credential_id and user_id=p_user_id for update;
      if not found or v_credential.credential_generation<>v_flow.expected_credential_generation or
        v_credential.client_domain is distinct from v_flow.expected_credential_domain or
        v_credential.google_subject is distinct from coalesce(v_flow.google_subject,v_flow.expected_google_subject) then
        return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict');
      end if;
    end if;
    v_context:=integration.vendor_calendar_context_v2(p_user_id,p_session_id,p_case_id);
    if v_context->'ok' is distinct from 'true'::jsonb then return v_context; end if;
    if v_flow.expires_at<=clock_timestamp() then
      perform integration.vendor_calendar_retire_flow_v2(v_flow.id,'expired');
      return pg_catalog.jsonb_build_object('ok',false,'state','flow_expired');
    end if;
    if p_action='callback_claim' then
      if v_flow.stage<>'oauth_pending' then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
      update integration.vendor_google_calendar_flows set stage='callback_claimed' where id=v_flow.id returning * into v_flow;
      perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,v_flow.expires_at);
      return pg_catalog.jsonb_build_object('ok',true,'flow',to_jsonb(v_flow));
    end if;
    if p_action='callback_complete' then
      select array_agg(x) into v_scopes from jsonb_array_elements_text(p_input->'granted_scopes') x;
      if v_flow.stage<>'callback_claimed' or p_input->>'state_digest' is distinct from v_flow.state_digest or
        v_flow.google_subject is null or v_flow.google_subject is distinct from p_input->>'google_subject' or
        coalesce(length(p_input->>'google_subject'),0) not between 1 and 255 or
        (v_flow.expected_google_subject is not null and v_flow.expected_google_subject is distinct from p_input->>'google_subject') or
        coalesce(p_input->>'quarantined_credential','') not like 'v2.%' or
        coalesce(length(p_input->>'return_digest'),0)<>43 or
        coalesce((p_input->>'token_expires_at')::timestamptz,'-infinity'::timestamptz)<=clock_timestamp() then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
      if cardinality(v_scopes) is distinct from 3 or not(v_scopes @> v_expected_scopes and v_scopes <@ v_expected_scopes) then
        return pg_catalog.jsonb_build_object('ok',false,'state','scope_not_supported');
      end if;
      update integration.vendor_google_calendar_flows set stage='return_ready',
        google_subject=p_input->>'google_subject',return_digest=p_input->>'return_digest',sealed_verifier=null,
        quarantined_credential=p_input->>'quarantined_credential',token_expires_at=(p_input->>'token_expires_at')::timestamptz,granted_scopes=v_scopes
      where id=v_flow.id returning * into v_flow;
      perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,v_flow.expires_at);
      return pg_catalog.jsonb_build_object('ok',true,'flow_ref',v_flow.id,'flow_revision',v_flow.flow_revision,'expires_at',v_flow.expires_at);
    end if;
    if p_action='callback_subject' then
      if v_flow.stage<>'callback_claimed' or v_flow.google_subject is not null or
        p_input->>'state_digest' is distinct from v_flow.state_digest or
        coalesce(length(p_input->>'google_subject'),0) not between 1 and 255 or
        (v_flow.expected_google_subject is not null and v_flow.expected_google_subject is distinct from p_input->>'google_subject') then
        return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid');
      end if;
      -- Email-first accounts learn the subject only from verified Google userinfo.
      -- Capture the existing same-owner credential once, before sealing the pending envelope.
      if v_flow.expected_credential_id is null then
        select * into v_credential from integration.vendor_google_calendar_credentials
          where user_id=p_user_id and google_subject=p_input->>'google_subject' for update;
        if found and v_credential.client_domain is distinct from v_domain then
          return pg_catalog.jsonb_build_object('ok',false,'state','reconsent_required');
        end if;
      end if;
      update integration.vendor_google_calendar_flows set google_subject=p_input->>'google_subject',
        expected_credential_id=v_credential.id,expected_credential_generation=coalesce(v_credential.credential_generation,0),
        expected_credential_domain=v_credential.client_domain where id=v_flow.id returning * into v_flow;
      perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,v_flow.expires_at);
      return pg_catalog.jsonb_build_object('ok',true,'flow',to_jsonb(v_flow),'reuse_credential',
        case when v_credential.client_domain=v_domain and v_credential.credential_status='active' then to_jsonb(v_credential) else null end);
    end if;
    if p_action='callback_check' then
      if v_flow.stage<>'callback_claimed' or p_input->>'state_digest' is distinct from v_flow.state_digest then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
      return pg_catalog.jsonb_build_object('ok',true,'flow_ref',v_flow.id,'flow_revision',v_flow.flow_revision);
    end if;
    if p_action='finish' then
      if v_flow.stage<>'return_ready' or v_flow.return_digest is null or p_input->>'return_digest' is distinct from v_flow.return_digest then
        if v_flow.failed_proofs>=8 then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid','rate_limited',true); end if;
        update integration.vendor_google_calendar_flows set failed_proofs=least(failed_proofs+1,1000000) where id=v_flow.id;
        return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid');
      end if;
      update integration.vendor_google_calendar_flows set stage='selection_ready',flow_revision=flow_revision+1,return_digest=null where id=v_flow.id;
      perform integration.vendor_calendar_audit_v2(p_user_id,p_case_id,v_flow.id,null,'finish',pg_catalog.jsonb_build_object('stage',v_flow.stage,'revision',v_flow.flow_revision),pg_catalog.jsonb_build_object('stage','selection_ready','revision',v_flow.flow_revision+1));
      perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,v_flow.expires_at);
      return pg_catalog.jsonb_build_object('ok',true,'state','selection_required','flow_ref',v_flow.id,'flow_revision',v_flow.flow_revision+1,'expires_at',v_flow.expires_at);
    end if;
    if v_flow.stage<>'selection_ready' or v_flow.quarantined_credential is null or v_flow.token_expires_at is null or v_flow.token_expires_at<=clock_timestamp() then
      return pg_catalog.jsonb_build_object('ok',false,'state','reconsent_required');
    end if;
    if p_action='flow_read' then
      return pg_catalog.jsonb_build_object('ok',true,'flow',to_jsonb(v_flow),'choices',coalesce((select jsonb_agg(to_jsonb(c) order by c.choice_ref) from integration.vendor_google_calendar_choices c where c.flow_id=v_flow.id),'[]'::jsonb));
    end if;
    if p_action='choices_store' then
      if v_flow.choices_loaded or jsonb_typeof(p_input->'calendars') is distinct from 'array' or jsonb_array_length(p_input->'calendars')>250 then
        return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict');
      end if;
      for v_item in select * from jsonb_array_elements(p_input->'calendars') loop
        insert into integration.vendor_google_calendar_choices(flow_id,user_id,case_id,calendar_id,label,time_zone)
        values(v_flow.id,p_user_id,p_case_id,v_item->>'calendar_id',v_item->>'label',v_item->>'time_zone');
      end loop;
      update integration.vendor_google_calendar_flows set choices_loaded=true,flow_revision=flow_revision+1 where id=v_flow.id returning * into v_flow;
      perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,v_flow.expires_at);
      return pg_catalog.jsonb_build_object('ok',true,'flow',to_jsonb(v_flow),'choices',coalesce((select jsonb_agg(to_jsonb(c) order by c.choice_ref) from integration.vendor_google_calendar_choices c where c.flow_id=v_flow.id),'[]'::jsonb));
    end if;
    if p_action='save' then
      if not v_flow.choices_loaded or (p_input->>'expected_sharing_revision')::bigint is distinct from v_flow.expected_sharing_revision or
        jsonb_typeof(p_input->'choices') is distinct from 'array' or jsonb_array_length(p_input->'choices') <> 1 or
        coalesce(p_input->>'encrypted_credential','') not like 'v2.%' then return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict'); end if;
      v_count:=jsonb_array_length(p_input->'choices');
      if (select count(distinct x->>'choice_ref') from jsonb_array_elements(p_input->'choices') x)<>v_count then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
      for v_item in select * from jsonb_array_elements(p_input->'choices') loop
        select * into v_choice from integration.vendor_google_calendar_choices where choice_ref=(v_item->>'choice_ref')::uuid and flow_id=v_flow.id and user_id=p_user_id and case_id=p_case_id;
        if not found or v_item->>'share_mode' is distinct from 'full_detail' or not coalesce((p_input->'verified_calendar_ids') ? v_choice.calendar_id,false) then
          return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid');
        end if;
        v_anchor:=coalesce(v_anchor,v_choice.calendar_id);
      end loop;
      v_previous:=coalesce(integration.vendor_calendar_binding_view_v2(v_binding.id,false),pg_catalog.jsonb_build_object('state','unlinked','sharing_revision',0));
      v_generation:=v_flow.expected_credential_generation+1;
      if v_flow.expected_credential_id is null then
        if exists(select 1 from integration.vendor_google_calendar_credentials where user_id=p_user_id and google_subject=v_flow.google_subject) then
          return pg_catalog.jsonb_build_object('ok',false,'state','reconsent_required');
        end if;
        insert into integration.vendor_google_calendar_credentials(user_id,google_subject,encrypted_credential,token_expires_at,granted_scopes,client_domain,credential_generation)
        values(p_user_id,v_flow.google_subject,p_input->>'encrypted_credential',v_flow.token_expires_at,v_flow.granted_scopes,v_domain,v_generation) returning * into v_credential;
      else
        if v_credential.google_subject is distinct from v_flow.google_subject then return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid'); end if;
        update integration.vendor_google_calendar_credentials set encrypted_credential=p_input->>'encrypted_credential',token_expires_at=v_flow.token_expires_at,granted_scopes=v_flow.granted_scopes,
          client_domain=v_domain,credential_generation=v_generation,credential_status='active',updated_at=clock_timestamp() where id=v_credential.id returning * into v_credential;
      end if;
      v_revision:=v_flow.expected_sharing_revision+1;
      if v_binding.id is null then
        insert into integration.vendor_google_calendar_bindings(credential_id,user_id,case_id,google_subject,account_role,calendar_id,time_zone,sharing_revision,credential_domain)
        values(v_credential.id,p_user_id,p_case_id,v_flow.google_subject,'pro',v_anchor,'Asia/Taipei',v_revision,v_domain) returning * into v_binding;
      else
        update integration.vendor_google_calendar_bindings set credential_id=v_credential.id,google_subject=v_flow.google_subject,calendar_id=v_anchor,binding_status='active',sharing_revision=v_revision,credential_domain=v_domain,updated_at=clock_timestamp()
        where id=v_binding.id returning * into v_binding;
      end if;
      update integration.vendor_google_calendar_selections set active=false where binding_id=v_binding.id;
      for v_item in select * from jsonb_array_elements(p_input->'choices') loop
        select * into strict v_choice from integration.vendor_google_calendar_choices where choice_ref=(v_item->>'choice_ref')::uuid and flow_id=v_flow.id;
        insert into integration.vendor_google_calendar_selections(binding_id,user_id,case_id,calendar_id,label,share_mode)
        values(v_binding.id,p_user_id,p_case_id,v_choice.calendar_id,v_choice.label,v_item->>'share_mode')
        on conflict(binding_id,calendar_id) do update set label=excluded.label,share_mode=excluded.share_mode,active=true;
      end loop;
      update integration.vendor_google_calendar_flows set stage='saved',flow_revision=flow_revision+1,initiation_digest=null,return_digest=null,sealed_verifier=null,quarantined_credential=null,token_expires_at=null,granted_scopes=null where id=v_flow.id;
      v_next:=integration.vendor_calendar_binding_view_v2(v_binding.id,false);
      perform integration.vendor_calendar_audit_v2(p_user_id,p_case_id,null,v_binding.id,'save',v_previous,v_next);
      perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,v_flow.expires_at);
      return pg_catalog.jsonb_build_object('ok',true)||v_next;
    end if;
  end if;

  select * into v_binding from integration.vendor_google_calendar_bindings where user_id=p_user_id and case_id=p_case_id and account_role='pro' for update;
  if not found then
    if p_action='grant' then return pg_catalog.jsonb_build_object('ok',true,'state','unlinked'); end if;
    return pg_catalog.jsonb_build_object('ok',false,'state','reconnect_required');
  end if;
  select * into strict v_credential from integration.vendor_google_calendar_credentials where id=v_binding.credential_id and user_id=p_user_id for update;
  v_context:=integration.vendor_calendar_context_v2(p_user_id,p_session_id,p_case_id);
  if v_context->'ok' is distinct from 'true'::jsonb then return v_context; end if;
  if p_action='grant' then
    v_next:=integration.vendor_calendar_binding_view_v2(v_binding.id,false);
    if v_binding.credential_domain is distinct from v_domain or v_credential.client_domain is distinct from v_domain or
       cardinality(v_credential.granted_scopes) is distinct from 3 or not(v_credential.granted_scopes @> v_expected_scopes and v_credential.granted_scopes <@ v_expected_scopes) or
       (select count(*) from integration.vendor_google_calendar_selections s where s.binding_id=v_binding.id and s.active) is distinct from 1 or
       (select count(*) from integration.vendor_google_calendar_selections s where s.binding_id=v_binding.id and s.active and s.share_mode='full_detail') is distinct from 1 then
      v_next:=v_next||pg_catalog.jsonb_build_object('state','reconnect_required');
    end if;
    return pg_catalog.jsonb_build_object('ok',true)||v_next;
  end if;
  if (p_input->>'binding_ref')::uuid is distinct from v_binding.binding_ref or
    (p_input->>'expected_sharing_revision')::bigint is distinct from v_binding.sharing_revision then
    return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict');
  end if;
  if p_action='unlink' then
    v_previous:=integration.vendor_calendar_binding_view_v2(v_binding.id,false);
    update integration.vendor_google_calendar_bindings set binding_status='revoked',sharing_revision=sharing_revision+1,updated_at=clock_timestamp() where id=v_binding.id returning * into v_binding;
    update integration.vendor_google_calendar_selections set active=false where binding_id=v_binding.id;
    if not exists(select 1 from integration.vendor_google_calendar_bindings b join integration.vendor_google_calendar_selections s on s.binding_id=b.id and s.active where b.credential_id=v_credential.id and b.binding_status='active' and b.sharing_revision>0) then
      update integration.vendor_google_calendar_credentials set credential_status='revoked',encrypted_credential=null,credential_generation=credential_generation+1,updated_at=clock_timestamp() where id=v_credential.id;
    end if;
    v_next:=pg_catalog.jsonb_build_object('state','unlinked','binding_ref',v_binding.binding_ref,'sharing_revision',v_binding.sharing_revision);
    perform integration.vendor_calendar_audit_v2(p_user_id,p_case_id,null,v_binding.id,'unlink',v_previous,v_next);
    perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,null);
    return pg_catalog.jsonb_build_object('ok',true)||v_next;
  end if;
  if v_binding.binding_status<>'active' or v_binding.sharing_revision=0 or v_credential.credential_status<>'active' or
    v_binding.credential_domain is distinct from v_domain or v_credential.client_domain is distinct from v_domain or
    (select count(*) from integration.vendor_google_calendar_selections s where s.binding_id=v_binding.id and s.active) is distinct from 1 or
     (select count(*) from integration.vendor_google_calendar_selections s where s.binding_id=v_binding.id and s.active and s.share_mode='full_detail') is distinct from 1 or
     cardinality(v_credential.granted_scopes) is distinct from 3 or not(v_credential.granted_scopes @> v_expected_scopes and v_credential.granted_scopes <@ v_expected_scopes) then
    return pg_catalog.jsonb_build_object('ok',false,'state','reconnect_required');
  end if;
  if p_action in ('read_check','refresh_commit','mark_reconnect') and (p_input->>'credential_generation')::bigint is distinct from v_credential.credential_generation then
    return pg_catalog.jsonb_build_object('ok',false,'state','revision_conflict');
  end if;
  if p_action='mark_reconnect' then
    update integration.vendor_google_calendar_credentials set credential_status='reconnect_required',
      credential_generation=credential_generation+1,updated_at=clock_timestamp() where id=v_credential.id;
    -- Google has rejected this credential. Each case must confirm its saved choices again.
    update integration.vendor_google_calendar_selections set active=false where binding_id in
      (select b.id from integration.vendor_google_calendar_bindings b where b.credential_id=v_credential.id);
    for v_item in select jsonb_build_object('id',b.id,'case_id',b.case_id) from integration.vendor_google_calendar_bindings b where b.credential_id=v_credential.id loop
      perform integration.vendor_calendar_audit_v2(p_user_id,(v_item->>'case_id')::uuid,null,(v_item->>'id')::uuid,'reconnect_required',
        pg_catalog.jsonb_build_object('credential_generation',v_credential.credential_generation),
        pg_catalog.jsonb_build_object('credential_generation',v_credential.credential_generation+1,'state','reconnect_required'));
    end loop;
    perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,null);
    return pg_catalog.jsonb_build_object('ok',true,'state','reconnect_required');
  end if;
  if p_action='refresh_commit' then
    select array_agg(x) into v_scopes from jsonb_array_elements_text(p_input->'granted_scopes') x;
    if cardinality(v_scopes) is distinct from 3 or not(v_scopes @> v_expected_scopes and v_scopes <@ v_expected_scopes) or
      coalesce(p_input->>'encrypted_credential','') not like 'v2.%' or
      coalesce((p_input->>'token_expires_at')::timestamptz,'-infinity'::timestamptz)<=clock_timestamp() then return pg_catalog.jsonb_build_object('ok',false,'state','scope_not_supported'); end if;
    update integration.vendor_google_calendar_credentials set encrypted_credential=p_input->>'encrypted_credential',token_expires_at=(p_input->>'token_expires_at')::timestamptz,
      granted_scopes=v_scopes,credential_generation=credential_generation+1,updated_at=clock_timestamp() where id=v_credential.id;
    perform integration.vendor_calendar_audit_v2(p_user_id,p_case_id,null,v_binding.id,'refresh',pg_catalog.jsonb_build_object('credential_generation',v_credential.credential_generation),pg_catalog.jsonb_build_object('credential_generation',v_credential.credential_generation+1));
    perform integration.vendor_calendar_assert_live_v2(p_user_id,p_session_id,p_case_id,null);
    return pg_catalog.jsonb_build_object('ok',true)||integration.vendor_calendar_binding_view_v2(v_binding.id,true);
  end if;
  if p_action='read_prepare' then return pg_catalog.jsonb_build_object('ok',true)||integration.vendor_calendar_binding_view_v2(v_binding.id,true); end if;
  if p_action='read_check' then return pg_catalog.jsonb_build_object('ok',true,'binding_ref',v_binding.binding_ref,'sharing_revision',v_binding.sharing_revision,'credential_generation',v_credential.credential_generation); end if;
  if p_action in ('mutation_prepare','mutation_check','mutation_commit') then
    return pg_catalog.jsonb_build_object('ok',false,'state','read_only_sharing');
  end if;
  return pg_catalog.jsonb_build_object('ok',false,'state','flow_invalid');
exception when others then
  return pg_catalog.jsonb_build_object('ok',false,'state','setup_unavailable');
end;
$function$;

alter function public.vendor_google_calendar_dispatch_v2(text, uuid, uuid, uuid, jsonb)
  owner to postgres;
revoke all on function public.vendor_google_calendar_dispatch_v2(text, uuid, uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.vendor_google_calendar_dispatch_v2(text, uuid, uuid, uuid, jsonb)
  to service_role;

CREATE OR REPLACE FUNCTION public.owner_vendor_google_calendar_projection_v1(p_authenticated_user_id uuid, p_expected_case_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    and pg_catalog.cardinality(credential.granted_scopes) = 3
    and credential.granted_scopes @> array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
    ]::text[]
    and credential.granted_scopes <@ array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
    ]::text[]
    and exists (
      select 1
      from integration.vendor_google_calendar_selections selection
      where selection.binding_id = binding.id
        and selection.user_id = binding.user_id
        and selection.case_id = binding.case_id
        and selection.active is true
        and selection.share_mode = 'full_detail'
    )
    and 1 = (
      select pg_catalog.count(*)
      from integration.vendor_google_calendar_selections selection
      where selection.binding_id = binding.id and selection.active is true
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
    and pg_catalog.cardinality(credential.granted_scopes) = 3
    and credential.granted_scopes @> array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
    ]::text[]
    and credential.granted_scopes <@ array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
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
    and pg_catalog.cardinality(credential.granted_scopes) = 3
    and credential.granted_scopes @> array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
    ]::text[]
    and credential.granted_scopes <@ array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
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
      'share_mode', selection.share_mode
    )
    order by selection.selection_ref
  )
  into v_selections
  from integration.vendor_google_calendar_selections selection
  where selection.binding_id = v_binding.id
    and selection.user_id = v_binding.user_id
    and selection.case_id = v_binding.case_id
    and selection.active is true
    and selection.share_mode = 'full_detail';

  if v_selections is null or pg_catalog.jsonb_array_length(v_selections) <> 1 then
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
$function$;

alter function public.owner_vendor_google_calendar_projection_v1(uuid, uuid)
  owner to postgres;
revoke all on function public.owner_vendor_google_calendar_projection_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.owner_vendor_google_calendar_projection_v1(uuid, uuid)
  to service_role;

CREATE OR REPLACE FUNCTION public.pcm_vendor_google_calendar_projection_v1(p_authenticated_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_current_case_id uuid;
  v_authority jsonb;
  v_grant jsonb;
  v_vendor_count integer;
  v_binding_count integer;
  v_binding integration.vendor_google_calendar_bindings%rowtype;
  v_credential integration.vendor_google_calendar_credentials%rowtype;
  v_selections jsonb;
begin
  if current_setting('role', true) is distinct from 'service_role'
     or p_authenticated_user_id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'state', 'authority_denied');
  end if;

  v_authority := drs_forward_private.drs_identity_authority_resolve_locked_v1(
    p_authenticated_user_id, null, null
  );
  if v_authority->'authorized' is distinct from 'true'::jsonb
     or v_authority->>'authenticated_user_id' is distinct from p_authenticated_user_id::text
     or v_authority->>'account_role' is distinct from 'drs'
     or v_authority->>'auth_binding_status' is distinct from 'active'
     or v_authority->>'specialist_status' is distinct from 'active'
     or v_authority->>'assignment_status' is distinct from 'active'
     or v_authority->>'lock_status' is distinct from 'locked'
     or v_authority->>'terminated_at' is not null
     or v_authority->>'selected_case_id' is null
     or v_authority->>'authorization_subject' is null then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'state', case when v_authority->>'state' = 'CASE_SELECTION_REQUIRED'
        then 'case_selection_required' else 'authority_denied' end
    );
  end if;
  v_current_case_id := (v_authority->>'selected_case_id')::uuid;
  v_grant := public.drs_workspace_grant_v2(
    p_authenticated_user_id, v_current_case_id,
    v_authority->>'authorization_subject'
  );
  if v_grant->'authorized' is distinct from 'true'::jsonb
     or v_grant->>'authenticated_user_id' is distinct from p_authenticated_user_id::text
     or v_grant->>'case_id' is distinct from v_current_case_id::text
     or v_grant->>'authorization_subject' is distinct from v_authority->>'authorization_subject'
     or (v_grant->>'grant_expires_at')::timestamptz <= pg_catalog.clock_timestamp() then
    return pg_catalog.jsonb_build_object('ok', false, 'state', 'authority_denied');
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
  where binding.case_id = v_current_case_id
    and binding.account_role = 'pro'
    and binding.binding_status = 'active'
    and binding.sharing_revision > 0
    and binding.credential_domain is not null
    and binding.credential_domain is not distinct from credential.client_domain
    and credential.credential_status = 'active'
    and credential.credential_generation > 0
    and credential.encrypted_credential like 'v2.%'
    and pg_catalog.cardinality(credential.granted_scopes) = 3
    and credential.granted_scopes @> array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
    ]::text[]
    and credential.granted_scopes <@ array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
    ]::text[]
    and exists (
      select 1
      from integration.vendor_google_calendar_selections selection
      where selection.binding_id = binding.id
        and selection.user_id = binding.user_id
        and selection.case_id = binding.case_id
        and selection.active is true
        and selection.share_mode = 'full_detail'
    )
    and 1 = (
      select pg_catalog.count(*)
      from integration.vendor_google_calendar_selections selection
      where selection.binding_id = binding.id and selection.active is true
    );

  if v_vendor_count = 0 or v_binding_count = 0 then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'state', 'not_shared',
      'case_id', v_current_case_id
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
  where binding.case_id = v_current_case_id
    and binding.account_role = 'pro'
    and binding.binding_status = 'active'
    and binding.sharing_revision > 0
    and binding.credential_domain is not null
    and binding.credential_domain is not distinct from credential.client_domain
    and credential.credential_status = 'active'
    and credential.credential_generation > 0
    and credential.encrypted_credential like 'v2.%'
    and pg_catalog.cardinality(credential.granted_scopes) = 3
    and credential.granted_scopes @> array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
    ]::text[]
    and credential.granted_scopes <@ array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
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
    and pg_catalog.cardinality(credential.granted_scopes) = 3
    and credential.granted_scopes @> array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
    ]::text[]
    and credential.granted_scopes <@ array[
      'openid',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.owned.readonly'
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
      'share_mode', selection.share_mode
    )
    order by selection.selection_ref
  )
  into v_selections
  from integration.vendor_google_calendar_selections selection
  where selection.binding_id = v_binding.id
    and selection.user_id = v_binding.user_id
    and selection.case_id = v_binding.case_id
    and selection.active is true
    and selection.share_mode = 'full_detail';

  if v_selections is null or pg_catalog.jsonb_array_length(v_selections) <> 1 then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'state', 'not_shared',
      'case_id', v_current_case_id
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'state', 'ready',
    'case_id', v_current_case_id,
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
$function$;


alter function public.pcm_vendor_google_calendar_projection_v1(uuid)
  owner to postgres;
revoke all on function public.pcm_vendor_google_calendar_projection_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.pcm_vendor_google_calendar_projection_v1(uuid)
  to service_role;

commit;

begin;

-- Knowledge Studio and Gateway are RPC-only client surfaces. Browser roles do
-- not receive direct table or sequence access in the A5 schemas.
revoke all privileges on all tables in schema knowledge
from public, anon, authenticated;
revoke all privileges on all sequences in schema knowledge
from public, anon, authenticated;
revoke all privileges on all tables in schema knowledge_staging
from public, anon, authenticated;
revoke all privileges on all sequences in schema knowledge_staging
from public, anon, authenticated;
revoke all privileges on all tables in schema casework
from public, anon, authenticated;
revoke all privileges on all sequences in schema casework
from public, anon, authenticated;

alter default privileges in schema knowledge
revoke all on tables from public, anon, authenticated;
alter default privileges in schema knowledge
revoke all on sequences from public, anon, authenticated;

alter default privileges in schema knowledge_staging
revoke all on tables from public, anon, authenticated;
alter default privileges in schema knowledge_staging
revoke all on sequences from public, anon, authenticated;

alter default privileges in schema casework
revoke all on tables from public, anon, authenticated;
alter default privileges in schema casework
revoke all on sequences from public, anon, authenticated;

-- PostgreSQL grants PUBLIC function execution globally by default; a
-- schema-scoped default revoke cannot override that global default. Every A5
-- function is therefore revoked and granted by exact signature below.

revoke all on schema knowledge from public, anon, authenticated;
revoke all on schema knowledge_staging from public, anon, authenticated;
revoke all on schema casework from public, anon, authenticated;

-- These two schemas are visible only so authenticated Storage policies can
-- resolve their reviewed helper functions. No table privileges accompany use.
grant usage on schema knowledge to authenticated;
grant usage on schema casework to authenticated;

create or replace function knowledge.assert_studio_payload_complete(
  p_payload jsonb
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_missing text[] := array[]::text[];
begin
  if jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'schema_version' <> 'knowledge_studio.v1'
    or jsonb_typeof(p_payload -> 'content') <> 'object' then
    raise exception 'Studio payload is not valid';
  end if;

  if length(btrim(coalesce(p_payload ->> 'title', ''))) = 0 then
    v_missing := array_append(v_missing, 'title');
  end if;
  if length(btrim(coalesce(p_payload -> 'content' ->> 'displayType', ''))) = 0
  then
    v_missing := array_append(v_missing, 'displayType');
  end if;
  if length(btrim(coalesce(p_payload -> 'content' ->> 'owner', ''))) = 0 then
    v_missing := array_append(v_missing, 'owner');
  end if;
  if length(btrim(coalesce(p_payload ->> 'summary', ''))) = 0 then
    v_missing := array_append(v_missing, 'summary');
  end if;
  if length(btrim(coalesce(p_payload -> 'content' ->> 'criteria', ''))) = 0
  then
    v_missing := array_append(v_missing, 'criteria');
  end if;
  if length(btrim(coalesce(p_payload -> 'content' ->> 'nextOwner', ''))) = 0
  then
    v_missing := array_append(v_missing, 'nextOwner');
  end if;
  if jsonb_typeof(p_payload -> 'evidence_summary') <> 'array'
    or jsonb_array_length(p_payload -> 'evidence_summary') = 0
    or not exists (
      select 1
      from jsonb_array_elements_text(p_payload -> 'evidence_summary') item
      where length(btrim(item)) > 0
    ) then
    v_missing := array_append(v_missing, 'evidence_summary');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'Studio required fields are incomplete: %',
      array_to_string(v_missing, ', ');
  end if;
end;
$$;

create or replace function knowledge.assert_studio_version_complete(
  p_entry_id uuid,
  p_version_id uuid
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  select jsonb_build_object(
    'schema_version', 'knowledge_studio.v1',
    'title', ev.title,
    'summary', ev.summary,
    'content', ev.content,
    'evidence_summary', ev.evidence_summary
  )
  into v_payload
  from knowledge.entry_versions ev
  join knowledge.entries e on e.id = ev.entry_id
  join knowledge.sources s on s.id = ev.source_id
  where ev.entry_id = p_entry_id
    and ev.id = p_version_id
    and e.id = p_entry_id;

  if v_payload is null then
    raise exception 'Studio version was not found';
  end if;

  perform knowledge.assert_studio_payload_complete(v_payload);
end;
$$;

create or replace function public.knowledge_studio_save_and_submit(
  p_entry_id uuid,
  p_version_id uuid,
  p_payload jsonb,
  p_note text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_saved jsonb;
  v_event_id uuid;
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  perform knowledge.assert_studio_payload_complete(p_payload);

  v_saved := public.knowledge_studio_update_draft(
    p_entry_id,
    p_version_id,
    p_payload
  );

  perform knowledge.assert_studio_version_complete(
    p_entry_id,
    p_version_id
  );

  v_event_id := knowledge.submit_entry_version_for_review(
    p_entry_id,
    p_version_id,
    p_note
  );

  return v_saved || jsonb_build_object(
    'eventId', v_event_id,
    'lifecycleState', 'pending_review',
    'formalImpact', 'none'
  );
end;
$$;

create or replace function public.knowledge_submit_for_review(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  perform knowledge.assert_studio_version_complete(
    p_entry_id,
    p_version_id
  );
  return knowledge.submit_entry_version_for_review(
    p_entry_id,
    p_version_id,
    p_note
  );
end;
$$;

create or replace function public.knowledge_publish_entry_version(
  p_entry_id uuid,
  p_version_id uuid,
  p_note text default ''
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not knowledge.is_interactive_reviewer() then
    raise exception 'Interactive PCM or admin reviewer required';
  end if;

  perform knowledge.assert_studio_version_complete(
    p_entry_id,
    p_version_id
  );
  return knowledge.publish_entry_version(
    p_entry_id,
    p_version_id,
    p_note
  );
end;
$$;

-- A case member may use more than one A5 client, but each client can read only
-- the finding domains allowed by its active-session JWT. Evidence is returned
-- only when it is linked to a finding in an allowed domain.
create or replace function public.gateway_get_case_evidence(
  p_case_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not casework.is_case_member(p_case_id) then
    raise exception 'Case access denied';
  end if;

  return jsonb_build_object(
    'caseId', p_case_id,
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'documentId', d.id,
        'sourceDocumentId', d.source_document_id,
        'pdfId', d.pdf_id,
        'title', d.title,
        'sha256', d.vault_sha256,
        'revision', d.revision
      ) order by d.uploaded_at, d.id)
      from casework.documents d
      where d.case_id = p_case_id
        and knowledge.can_access_domain('drawing_review')
    ), '[]'::jsonb),
    'sheets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sheetId', s.id,
        'documentId', s.document_id,
        'schemaVersion', s.record_schema_version,
        'leakageGroup', s.leakage_group,
        'pdfId', s.pdf_id,
        'sourceDocumentId', s.source_document_id,
        'pageNumber', s.page_number,
        'sourceCandidateClass', s.source_candidate_class,
        'pageTypeCandidate', s.page_type_candidate,
        'applicableRuleId', s.applicable_rule_id,
        'drawingIdentity', s.drawing_identity,
        'reviewChecks', s.review_checks,
        'sheetCompletenessCandidate', s.sheet_completeness_candidate,
        'crossSheetConsistencyStatus', s.cross_sheet_consistency_status,
        'confidence', s.confidence,
        'priority', s.priority,
        'reviewState', s.review_state,
        'reviewerClass', s.reviewer_class,
        'reviewerId', s.reviewer_id,
        'reviewedAt', s.reviewed_at,
        'reviewAuthorizations', s.review_authorizations,
        'humanReviewRequired', s.human_review_required,
        'trainable', s.trainable,
        'exclusionReason', s.exclusion_reason,
        'decisionProvenance', s.decision_provenance,
        'formalImpact', 'none'
      ) order by s.source_document_id, s.page_number)
      from casework.pdf_sheets s
      where s.case_id = p_case_id
        and knowledge.can_access_domain('drawing_review')
    ), '[]'::jsonb),
    'findings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'findingId', f.id,
        'sheetId', f.pdf_sheet_id,
        'domain', f.domain,
        'findingType', f.finding_type,
        'candidateRiskNote', f.candidate_risk_note,
        'requestedSupplementCandidate', f.requested_supplement_candidate,
        'evidenceBasis', f.evidence_basis,
        'evidenceReviewStatus', f.evidence_review_status,
        'confidence', f.confidence,
        'priority', f.priority,
        'nextReviewerRole', f.next_reviewer_role,
        'reviewState', f.review_state,
        'humanReviewRequired', f.human_review_required,
        'formalImpact', 'none'
      ) order by f.created_at, f.id)
      from casework.findings f
      where f.case_id = p_case_id
        and knowledge.can_access_domain(f.domain)
    ), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'evidenceId', e.id,
        'findingId', e.finding_id,
        'sheetId', e.pdf_sheet_id,
        'type', e.evidence_type,
        'sourceDocumentId', e.source_document_id,
        'pageNumber', e.page_number,
        'sourceRef', e.source_ref,
        'evidenceBasis', e.evidence_basis,
        'formalImpact', 'none'
      ) order by e.created_at, e.id)
      from casework.evidence_links e
      join casework.findings f
        on f.id = e.finding_id
       and f.case_id = e.case_id
      where e.case_id = p_case_id
        and knowledge.can_access_domain(f.domain)
    ), '[]'::jsonb),
    'formalImpact', 'none'
  );
end;
$$;

-- Storage policies cannot depend on direct SELECT privileges in casework.
-- The helper parses the case folder, checks an active session, and fails
-- closed for malformed paths.
create or replace function casework.can_access_case_document(
  p_object_name text,
  p_write boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_case_id uuid;
  v_folder text;
begin
  v_folder := (storage.foldername(p_object_name))[1];
  if v_folder is null then
    return false;
  end if;

  begin
    v_case_id := v_folder::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  if p_write then
    return casework.has_case_role(
      v_case_id,
      array['owner', 'pro', 'pcm']::knowledge.case_role[]
    );
  end if;
  return casework.is_case_member(v_case_id);
end;
$$;

alter policy knowledge_source_reviewer_read
on storage.objects
using (
  bucket_id = 'knowledge-source-private'
  and knowledge.is_interactive_reviewer()
);

alter policy knowledge_source_reviewer_insert
on storage.objects
with check (
  bucket_id = 'knowledge-source-private'
  and knowledge.is_interactive_reviewer()
);

alter policy case_document_member_read
on storage.objects
using (
  bucket_id = 'case-documents-private'
  and casework.can_access_case_document(name, false)
);

alter policy case_document_member_insert
on storage.objects
with check (
  bucket_id = 'case-documents-private'
  and casework.can_access_case_document(name, true)
);

-- Restrictive guards are AND-combined with every permissive policy on the
-- shared Storage table. They prevent a legacy broad policy from exposing or
-- mutating either A5 private bucket.
create policy a5_storage_read_guard
on storage.objects
as restrictive
for select to public
using (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, false)
  )
);

create policy a5_storage_insert_guard
on storage.objects
as restrictive
for insert to public
with check (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, true)
  )
);

create policy a5_storage_update_guard
on storage.objects
as restrictive
for update to public
using (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, true)
  )
)
with check (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, true)
  )
);

create policy a5_storage_delete_guard
on storage.objects
as restrictive
for delete to public
using (
  bucket_id not in (
    'knowledge-source-private',
    'case-documents-private'
  )
  or (
    bucket_id = 'knowledge-source-private'
    and knowledge.is_interactive_reviewer()
  )
  or (
    bucket_id = 'case-documents-private'
    and casework.can_access_case_document(name, true)
  )
);

-- Internal functions are unavailable by default. Only the two helpers used by
-- Storage RLS are callable by authenticated users.
revoke execute on all functions in schema knowledge
from public, anon, authenticated;
revoke execute on all functions in schema knowledge_staging
from public, anon, authenticated;
revoke execute on all functions in schema casework
from public, anon, authenticated;

alter function knowledge.is_interactive_reviewer() owner to postgres;
alter function knowledge.is_interactive_reviewer() security definer;
alter function knowledge.is_interactive_reviewer() set search_path = '';
revoke all on function knowledge.is_interactive_reviewer()
from public, anon, authenticated;
grant execute on function knowledge.is_interactive_reviewer()
to authenticated;

alter function casework.can_access_case_document(text, boolean)
owner to postgres;
alter function casework.can_access_case_document(text, boolean)
security definer;
alter function casework.can_access_case_document(text, boolean)
set search_path = '';
revoke all on function casework.can_access_case_document(text, boolean)
from public, anon, authenticated;
grant execute on function casework.can_access_case_document(text, boolean)
to authenticated;

alter function knowledge.assert_studio_payload_complete(jsonb)
owner to postgres;
alter function knowledge.assert_studio_version_complete(uuid, uuid)
owner to postgres;
revoke all on function knowledge.assert_studio_payload_complete(jsonb)
from public, anon, authenticated;
revoke all on function knowledge.assert_studio_version_complete(uuid, uuid)
from public, anon, authenticated;

-- Every public A5 RPC is a reviewed authorization boundary. Each function
-- retains a fixed empty search_path and performs its own role/domain/case gate.
alter function public.gateway_search_knowledge(text, text, integer)
security definer;
alter function public.gateway_search_knowledge(text, text, integer)
set search_path = '';
alter function public.gateway_get_knowledge_entry(uuid)
security definer;
alter function public.gateway_get_knowledge_entry(uuid)
set search_path = '';
alter function public.gateway_get_case_evidence(uuid)
security definer;
alter function public.gateway_get_case_evidence(uuid)
set search_path = '';
alter function public.gateway_record_finding(uuid, jsonb)
security definer;
alter function public.gateway_record_finding(uuid, jsonb)
set search_path = '';
alter function public.knowledge_ingest_batch(jsonb)
security definer;
alter function public.knowledge_ingest_batch(jsonb)
set search_path = '';
alter function public.knowledge_ingest_woodwork_batch(jsonb)
security definer;
alter function public.knowledge_ingest_woodwork_batch(jsonb)
set search_path = '';
alter function public.knowledge_studio_list(text, text, integer)
security definer;
alter function public.knowledge_studio_list(text, text, integer)
set search_path = '';
alter function public.knowledge_studio_get(uuid)
security definer;
alter function public.knowledge_studio_get(uuid)
set search_path = '';
alter function public.knowledge_studio_create_draft(jsonb)
security definer;
alter function public.knowledge_studio_create_draft(jsonb)
set search_path = '';
alter function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
security definer;
alter function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
set search_path = '';
alter function public.knowledge_studio_create_revision(uuid, jsonb, text)
security definer;
alter function public.knowledge_studio_create_revision(uuid, jsonb, text)
set search_path = '';
alter function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
security definer;
alter function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
set search_path = '';
alter function public.knowledge_submit_for_review(uuid, uuid, text)
security definer;
alter function public.knowledge_submit_for_review(uuid, uuid, text)
set search_path = '';
alter function public.knowledge_return_to_draft(uuid, uuid, text)
security definer;
alter function public.knowledge_return_to_draft(uuid, uuid, text)
set search_path = '';
alter function public.knowledge_publish_entry_version(uuid, uuid, text)
security definer;
alter function public.knowledge_publish_entry_version(uuid, uuid, text)
set search_path = '';
alter function public.knowledge_retire_entry(uuid, text)
security definer;
alter function public.knowledge_retire_entry(uuid, text)
set search_path = '';

alter function public.gateway_search_knowledge(text, text, integer)
owner to postgres;
alter function public.gateway_get_knowledge_entry(uuid)
owner to postgres;
alter function public.gateway_get_case_evidence(uuid)
owner to postgres;
alter function public.gateway_record_finding(uuid, jsonb)
owner to postgres;
alter function public.knowledge_ingest_batch(jsonb)
owner to postgres;
alter function public.knowledge_ingest_woodwork_batch(jsonb)
owner to postgres;
alter function public.knowledge_studio_list(text, text, integer)
owner to postgres;
alter function public.knowledge_studio_get(uuid)
owner to postgres;
alter function public.knowledge_studio_create_draft(jsonb)
owner to postgres;
alter function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
owner to postgres;
alter function public.knowledge_studio_create_revision(uuid, jsonb, text)
owner to postgres;
alter function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
owner to postgres;
alter function public.knowledge_submit_for_review(uuid, uuid, text)
owner to postgres;
alter function public.knowledge_return_to_draft(uuid, uuid, text)
owner to postgres;
alter function public.knowledge_publish_entry_version(uuid, uuid, text)
owner to postgres;
alter function public.knowledge_retire_entry(uuid, text)
owner to postgres;

revoke all on function public.gateway_search_knowledge(text, text, integer)
from public, anon, authenticated;
revoke all on function public.gateway_get_knowledge_entry(uuid)
from public, anon, authenticated;
revoke all on function public.gateway_get_case_evidence(uuid)
from public, anon, authenticated;
revoke all on function public.gateway_record_finding(uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.knowledge_ingest_batch(jsonb)
from public, anon, authenticated;
revoke all on function public.knowledge_ingest_woodwork_batch(jsonb)
from public, anon, authenticated;
revoke all on function public.knowledge_studio_list(text, text, integer)
from public, anon, authenticated;
revoke all on function public.knowledge_studio_get(uuid)
from public, anon, authenticated;
revoke all on function public.knowledge_studio_create_draft(jsonb)
from public, anon, authenticated;
revoke all on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.knowledge_studio_create_revision(uuid, jsonb, text)
from public, anon, authenticated;
revoke all on function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
from public, anon, authenticated;
revoke all on function public.knowledge_submit_for_review(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.knowledge_return_to_draft(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.knowledge_publish_entry_version(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.knowledge_retire_entry(uuid, text)
from public, anon, authenticated;

grant execute on function public.gateway_search_knowledge(text, text, integer)
to authenticated;
grant execute on function public.gateway_get_knowledge_entry(uuid)
to authenticated;
grant execute on function public.gateway_get_case_evidence(uuid)
to authenticated;
grant execute on function public.gateway_record_finding(uuid, jsonb)
to authenticated;
grant execute on function public.knowledge_ingest_batch(jsonb)
to authenticated;
grant execute on function public.knowledge_ingest_woodwork_batch(jsonb)
to authenticated;
grant execute on function public.knowledge_studio_list(text, text, integer)
to authenticated;
grant execute on function public.knowledge_studio_get(uuid)
to authenticated;
grant execute on function public.knowledge_studio_create_draft(jsonb)
to authenticated;
grant execute on function public.knowledge_studio_update_draft(uuid, uuid, jsonb)
to authenticated;
grant execute on function public.knowledge_studio_create_revision(
  uuid,
  jsonb,
  text
)
to authenticated;
grant execute on function public.knowledge_studio_save_and_submit(
  uuid,
  uuid,
  jsonb,
  text
)
to authenticated;
grant execute on function public.knowledge_submit_for_review(uuid, uuid, text)
to authenticated;
grant execute on function public.knowledge_return_to_draft(uuid, uuid, text)
to authenticated;
grant execute on function public.knowledge_publish_entry_version(
  uuid,
  uuid,
  text
)
to authenticated;
grant execute on function public.knowledge_retire_entry(uuid, text)
to authenticated;

commit;

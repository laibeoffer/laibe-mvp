begin;

do $guard$
declare dependency record;
begin
  for dependency in select * from (values
    ('auth.users','id','uuid'), ('auth.users','email','text|varchar'),
    ('auth.users','email_confirmed_at','timestamptz'), ('auth.users','deleted_at','timestamptz'), ('auth.users','banned_until','timestamptz'),
    ('auth.sessions','id','uuid'), ('auth.sessions','user_id','uuid'), ('auth.sessions','not_after','timestamptz'),
    ('drs_forward_private.specialists','specialist_id','uuid'), ('drs_forward_private.specialists','specialist_status','text'),
    ('drs_forward_private.auth_specialist_bindings','auth_binding_id','uuid'),
    ('drs_forward_private.auth_specialist_bindings','authenticated_user_id','uuid'),
    ('drs_forward_private.auth_specialist_bindings','specialist_id','uuid'),
    ('drs_forward_private.auth_specialist_bindings','binding_status','text'),
    ('drs_forward_private.auth_specialist_bindings','binding_version','int8'),
    ('drs_forward_private.auth_specialist_bindings','valid_from','timestamptz'),
    ('drs_forward_private.auth_specialist_bindings','valid_until','timestamptz'),
    ('drs_forward_private.auth_specialist_bindings','revoked_at','timestamptz'),
    ('drs_forward_private.reviewer_registration_operation_grants','grant_id','uuid'),
    ('drs_forward_private.reviewer_registration_operation_grants','actor_user_id','uuid'),
    ('drs_forward_private.reviewer_registration_operation_grants','operation','text'),
    ('drs_forward_private.reviewer_registration_operation_grants','scope','text'),
    ('drs_forward_private.reviewer_registration_operation_grants','status','text'),
    ('drs_forward_private.reviewer_registration_operation_grants','version','int8'),
    ('drs_forward_private.reviewer_registration_operation_grants','valid_from','timestamptz'),
    ('drs_forward_private.reviewer_registration_operation_grants','valid_until','timestamptz'),
    ('drs_forward_private.reviewer_registration_operation_grants','revoked_at','timestamptz'),
    ('drs_forward_private.reviewer_registration_operation_grants','granted_by','uuid'),
    ('drs_forward_private.reviewer_registration_operation_grants','authority_basis','text')
  ) as required(relation_name,column_name,type_names) loop
    if not exists (select 1 from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
      where a.attrelid=pg_catalog.to_regclass(dependency.relation_name) and a.attname=dependency.column_name
      and a.attnum>0 and not a.attisdropped and t.typname=any(pg_catalog.string_to_array(dependency.type_names,'|'))) then
      raise exception 'IDENTITY_AUTHORITY_SCHEMA_DRIFT' using errcode='55000';
    end if;
  end loop;
end $guard$;

alter table drs_forward_private.reviewer_registration_operation_grants
  add column specialist_id uuid,
  add column auth_binding_id uuid,
  add column auth_binding_version bigint,
  add column legacy_identity_unresolved boolean not null default false;

commit;

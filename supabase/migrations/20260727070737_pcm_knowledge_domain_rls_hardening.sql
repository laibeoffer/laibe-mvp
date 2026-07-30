begin;

alter policy source_approved_or_reviewer_read
on knowledge.sources
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and (
      exists (
        select 1
        from knowledge.entry_versions ev
        join knowledge.entries e on e.id = ev.entry_id
        where ev.source_id = sources.id
          and ev.lifecycle_state = 'approved'
          and e.lifecycle_state = 'approved'
          and knowledge.can_access_domain(e.domain)
      )
      or (
        knowledge.can_access_domain('budget')
        and exists (
          select 1
          from knowledge.price_observations po
          where po.source_id = sources.id
            and po.lifecycle_state = 'approved'
        )
      )
    )
  )
);

alter policy source_reviewer_insert
on knowledge.sources
with check (knowledge.is_interactive_reviewer());

alter policy source_reviewer_update
on knowledge.sources
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy entry_approved_or_reviewer_read
on knowledge.entries
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and knowledge.can_access_domain(domain)
  )
);

alter policy entry_reviewer_insert
on knowledge.entries
with check (knowledge.is_interactive_reviewer());

alter policy entry_reviewer_update
on knowledge.entries
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy version_approved_or_reviewer_read
on knowledge.entry_versions
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and exists (
      select 1
      from knowledge.entries e
      where e.id = entry_versions.entry_id
        and e.lifecycle_state = 'approved'
        and knowledge.can_access_domain(e.domain)
    )
  )
);

alter policy version_reviewer_insert
on knowledge.entry_versions
with check (knowledge.is_interactive_reviewer());

alter policy version_reviewer_update
on knowledge.entry_versions
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy drawing_rule_approved_or_reviewer_read
on knowledge.drawing_rules
using (
  knowledge.is_interactive_reviewer()
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = drawing_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
      and knowledge.can_access_domain(e.domain)
  )
);

alter policy drawing_rule_reviewer_write
on knowledge.drawing_rules
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy budget_rule_approved_or_reviewer_read
on knowledge.budget_rules
using (
  knowledge.is_interactive_reviewer()
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = budget_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
      and knowledge.can_access_domain(e.domain)
  )
);

alter policy budget_rule_reviewer_write
on knowledge.budget_rules
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy acceptance_rule_approved_or_reviewer_read
on knowledge.acceptance_rules
using (
  knowledge.is_interactive_reviewer()
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = acceptance_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
      and knowledge.can_access_domain(e.domain)
  )
);

alter policy acceptance_rule_reviewer_write
on knowledge.acceptance_rules
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy contract_rule_approved_or_reviewer_read
on knowledge.contract_evidence_rules
using (
  knowledge.is_interactive_reviewer()
  or exists (
    select 1
    from knowledge.entry_versions ev
    join knowledge.entries e on e.id = ev.entry_id
    where ev.id = contract_evidence_rules.entry_version_id
      and ev.lifecycle_state = 'approved'
      and e.lifecycle_state = 'approved'
      and knowledge.can_access_domain(e.domain)
  )
);

alter policy contract_rule_reviewer_write
on knowledge.contract_evidence_rules
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy price_observation_approved_or_reviewer_read
on knowledge.price_observations
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and knowledge.can_access_domain('budget')
  )
);

alter policy price_observation_reviewer_write
on knowledge.price_observations
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy relation_approved_or_reviewer_read
on knowledge.relations
using (
  knowledge.is_interactive_reviewer()
  or (
    lifecycle_state = 'approved'
    and exists (
      select 1
      from knowledge.entries source_entry
      join knowledge.entries target_entry
        on target_entry.id = relations.to_entry_id
      where source_entry.id = relations.from_entry_id
        and source_entry.lifecycle_state = 'approved'
        and target_entry.lifecycle_state = 'approved'
        and knowledge.can_access_domain(source_entry.domain)
        and knowledge.can_access_domain(target_entry.domain)
    )
  )
);

alter policy relation_reviewer_write
on knowledge.relations
using (knowledge.is_interactive_reviewer())
with check (knowledge.is_interactive_reviewer());

alter policy publication_event_reviewer_read
on knowledge.publication_events
using (knowledge.is_interactive_reviewer());

alter policy publication_event_reviewer_insert
on knowledge.publication_events
with check (
  knowledge.is_interactive_reviewer()
  and actor_id = (select auth.uid())
);

alter policy finding_member_read
on casework.findings
using (
  casework.is_case_member(case_id)
  and knowledge.can_access_domain(domain)
);

alter policy finding_member_insert
on casework.findings
with check (
  casework.has_case_role(
    case_id,
    array['owner', 'pro', 'pcm']::knowledge.case_role[]
  )
  and knowledge.can_access_domain(domain)
);

alter policy candidate_budget_owner_or_pcm_insert
on casework.candidate_budget_lines
with check (
  knowledge.current_client_id() not in ('a12', 'contract')
  and casework.has_case_role(
    case_id,
    array['owner', 'pcm']::knowledge.case_role[]
  )
);

commit;

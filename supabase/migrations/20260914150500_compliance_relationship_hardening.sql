-- Harden Blackstar Compliance Sentinel relationship ownership.
-- User-owned child records may only reference other records owned by the same authenticated user.

-- Applicability: optional profile must be owned by the row owner.
drop policy if exists compliance_applicability_insert_own on public.compliance_applicability;
create policy compliance_applicability_insert_own on public.compliance_applicability
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);

drop policy if exists compliance_applicability_update_own on public.compliance_applicability;
create policy compliance_applicability_update_own on public.compliance_applicability
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);

-- Obligations: optional profile must be owned. A selected version must belong to the selected regulation.
drop policy if exists compliance_obligations_insert_own on public.compliance_obligations;
create policy compliance_obligations_insert_own on public.compliance_obligations
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
  and (
    compliance_obligations.regulation_version_id is null
    or (
      compliance_obligations.regulation_id is not null
      and exists (
        select 1 from public.compliance_regulation_versions v
        where v.id = compliance_obligations.regulation_version_id
          and v.regulation_id = compliance_obligations.regulation_id
      )
    )
  )
);

drop policy if exists compliance_obligations_update_own on public.compliance_obligations;
create policy compliance_obligations_update_own on public.compliance_obligations
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
  and (
    compliance_obligations.regulation_version_id is null
    or (
      compliance_obligations.regulation_id is not null
      and exists (
        select 1 from public.compliance_regulation_versions v
        where v.id = compliance_obligations.regulation_version_id
          and v.regulation_id = compliance_obligations.regulation_id
      )
    )
  )
);

-- Controls: optional profile must be owned.
drop policy if exists compliance_controls_insert_own on public.compliance_controls;
create policy compliance_controls_insert_own on public.compliance_controls
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);

drop policy if exists compliance_controls_update_own on public.compliance_controls;
create policy compliance_controls_update_own on public.compliance_controls
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);

-- Assessments: optional profile must be owned.
drop policy if exists compliance_assessments_insert_own on public.compliance_assessments;
create policy compliance_assessments_insert_own on public.compliance_assessments
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);

drop policy if exists compliance_assessments_update_own on public.compliance_assessments;
create policy compliance_assessments_update_own on public.compliance_assessments
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);

-- Control mappings: both sides must be owned by the same authenticated user.
drop policy if exists compliance_control_mappings_insert_own on public.compliance_control_mappings;
create policy compliance_control_mappings_insert_own on public.compliance_control_mappings
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.compliance_obligations o
    where o.id = obligation_id and o.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.compliance_controls c
    where c.id = control_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists compliance_control_mappings_update_own on public.compliance_control_mappings;
create policy compliance_control_mappings_update_own on public.compliance_control_mappings
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.compliance_obligations o
    where o.id = obligation_id and o.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.compliance_controls c
    where c.id = control_id and c.user_id = (select auth.uid())
  )
);

-- Evidence: every optional linked operational record must be owned by the same user.
drop policy if exists compliance_evidence_insert_own on public.compliance_evidence;
create policy compliance_evidence_insert_own on public.compliance_evidence
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    obligation_id is null
    or exists (
      select 1 from public.compliance_obligations o
      where o.id = obligation_id and o.user_id = (select auth.uid())
    )
  )
  and (
    control_id is null
    or exists (
      select 1 from public.compliance_controls c
      where c.id = control_id and c.user_id = (select auth.uid())
    )
  )
  and (
    assessment_id is null
    or exists (
      select 1 from public.compliance_assessments a
      where a.id = assessment_id and a.user_id = (select auth.uid())
    )
  )
);

drop policy if exists compliance_evidence_update_own on public.compliance_evidence;
create policy compliance_evidence_update_own on public.compliance_evidence
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    obligation_id is null
    or exists (
      select 1 from public.compliance_obligations o
      where o.id = obligation_id and o.user_id = (select auth.uid())
    )
  )
  and (
    control_id is null
    or exists (
      select 1 from public.compliance_controls c
      where c.id = control_id and c.user_id = (select auth.uid())
    )
  )
  and (
    assessment_id is null
    or exists (
      select 1 from public.compliance_assessments a
      where a.id = assessment_id and a.user_id = (select auth.uid())
    )
  )
);

-- Findings: every optional linked operational record must be owned by the same user.
drop policy if exists compliance_findings_insert_own on public.compliance_findings;
create policy compliance_findings_insert_own on public.compliance_findings
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
  and (
    assessment_id is null
    or exists (
      select 1 from public.compliance_assessments a
      where a.id = assessment_id and a.user_id = (select auth.uid())
    )
  )
  and (
    obligation_id is null
    or exists (
      select 1 from public.compliance_obligations o
      where o.id = obligation_id and o.user_id = (select auth.uid())
    )
  )
  and (
    control_id is null
    or exists (
      select 1 from public.compliance_controls c
      where c.id = control_id and c.user_id = (select auth.uid())
    )
  )
);

drop policy if exists compliance_findings_update_own on public.compliance_findings;
create policy compliance_findings_update_own on public.compliance_findings
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
  and (
    assessment_id is null
    or exists (
      select 1 from public.compliance_assessments a
      where a.id = assessment_id and a.user_id = (select auth.uid())
    )
  )
  and (
    obligation_id is null
    or exists (
      select 1 from public.compliance_obligations o
      where o.id = obligation_id and o.user_id = (select auth.uid())
    )
  )
  and (
    control_id is null
    or exists (
      select 1 from public.compliance_controls c
      where c.id = control_id and c.user_id = (select auth.uid())
    )
  )
);

-- Alerts: optional profile must be owned.
drop policy if exists compliance_alerts_insert_own on public.compliance_alerts;
create policy compliance_alerts_insert_own on public.compliance_alerts
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);

drop policy if exists compliance_alerts_update_own on public.compliance_alerts;
create policy compliance_alerts_update_own on public.compliance_alerts
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);

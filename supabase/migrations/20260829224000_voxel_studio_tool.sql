-- Native bounded voxel asset tooling for the existing PalladiumAI agent/tool runtime.
insert into public.tools
  (slug, name, category, description, kind, requires_approval, risk_level, min_plan, is_active, config_schema)
values
  ('voxel_studio', 'Voxel Studio', 'creation',
   'Create, inspect, merge and convert bounded MagicaVoxel VOX assets without arbitrary filesystem access or a separate MCP/runtime service.',
   'builtin', false, 'low', 'builder', true,
   '{"formats":["vox","obj"],"actions":["create","inspect","merge","mesh"],"max_axis":256,"max_voxels":100000,"max_input_bytes":4194304,"max_merge_models":16,"max_mesh_voxels":10000,"arbitrary_filesystem":false,"shell":false,"credentials_required":false}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  kind = excluded.kind,
  requires_approval = excluded.requires_approval,
  risk_level = excluded.risk_level,
  min_plan = excluded.min_plan,
  is_active = excluded.is_active,
  config_schema = excluded.config_schema,
  updated_at = now();

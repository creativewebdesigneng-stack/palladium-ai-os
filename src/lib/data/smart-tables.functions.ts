import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };

const fieldType = z.enum(['text', 'number', 'boolean', 'date', 'select', 'url', 'email']);
const fieldSchema = z.object({
  key: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/),
  name: z.string().trim().min(1).max(80),
  type: fieldType,
  options: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
});
const fieldsSchema = z.array(fieldSchema).min(1).max(50);
const jsonRecord = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

function sanitizeValues(fields: Array<z.infer<typeof fieldSchema>>, raw: Record<string, string | number | boolean | null>) {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = byKey.get(key);
    if (!field) continue;
    if (value === null || value === '') { output[key] = null; continue; }
    if (field.type === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error(`${field.name} must be a number.`);
      output[key] = number;
    } else if (field.type === 'boolean') {
      output[key] = value === true || value === 'true';
    } else {
      const text = String(value).slice(0, 4000);
      if (field.type === 'url') { try { new URL(text); } catch { throw new Error(`${field.name} must be a valid URL.`); } }
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new Error(`${field.name} must be a valid email address.`);
      if (field.type === 'select' && field.options?.length && !field.options.includes(text)) throw new Error(`${field.name} contains an unsupported option.`);
      output[key] = text;
    }
  }
  return output;
}

export const listSmartTables = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('smart_tables')
      .select('id,name,description,fields,default_view,created_at,updated_at')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { tables: data ?? [] };
  });

export const getSmartTable = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: table, error }, { data: records }, { data: views }] = await Promise.all([
      sb.from('smart_tables').select('id,name,description,fields,default_view,created_at,updated_at').eq('id', data.id).eq('user_id', context.userId).maybeSingle(),
      sb.from('smart_table_records').select('id,values,created_at,updated_at').eq('table_id', data.id).eq('user_id', context.userId).order('created_at', { ascending: true }).limit(500),
      sb.from('smart_table_views').select('id,name,kind,config,created_at').eq('table_id', data.id).eq('user_id', context.userId).order('created_at', { ascending: true }),
    ]);
    if (error) throw new Error(error.message);
    if (!table) throw new Error('Smart table not found or access denied.');
    return { table, records: records ?? [], views: views ?? [] };
  });

export const createSmartTable = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional().default(''),
    fields: fieldsSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const keys = new Set(data.fields.map((field) => field.key));
    if (keys.size !== data.fields.length) throw new Error('Field keys must be unique.');
    const { data: table, error } = await sb.from('smart_tables').insert({
      user_id: context.userId,
      name: data.name,
      description: data.description || null,
      fields: data.fields,
    }).select('id,name,description,fields,default_view,created_at,updated_at').single();
    if (error) throw new Error(error.message);
    await sb.from('smart_table_views').insert({ user_id: context.userId, table_id: table.id, name: 'Grid', kind: 'grid', config: {} });
    await writeAudit({ userId: context.userId, orgId: null, action: 'smart_table.created', targetType: 'smart_table', targetId: table.id, status: 'success', metadata: { fields: data.fields.length } });
    return table;
  });

export const saveSmartTableRecord = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tableId: z.string().uuid(), id: z.string().uuid().optional(), values: jsonRecord }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: table, error: tableError } = await sb.from('smart_tables').select('id,fields').eq('id', data.tableId).eq('user_id', context.userId).maybeSingle();
    if (tableError) throw new Error(tableError.message);
    if (!table) throw new Error('Smart table not found or access denied.');
    const fields = fieldsSchema.parse(table.fields);
    const values = sanitizeValues(fields, data.values);
    const now = new Date().toISOString();
    const query = data.id
      ? sb.from('smart_table_records').update({ values, updated_at: now }).eq('id', data.id).eq('table_id', data.tableId).eq('user_id', context.userId)
      : sb.from('smart_table_records').insert({ user_id: context.userId, table_id: data.tableId, values });
    const { data: row, error } = await query.select('id,values,created_at,updated_at').single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSmartTableRecord = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tableId: z.string().uuid(), id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from('smart_table_records').delete().eq('id', data.id).eq('table_id', data.tableId).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSmartTableView = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    tableId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    kind: z.enum(['grid', 'kanban', 'form']),
    config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: table } = await sb.from('smart_tables').select('id').eq('id', data.tableId).eq('user_id', context.userId).maybeSingle();
    if (!table) throw new Error('Smart table not found or access denied.');
    const { data: view, error } = await sb.from('smart_table_views').insert({ user_id: context.userId, table_id: data.tableId, name: data.name, kind: data.kind, config: data.config }).select('id,name,kind,config,created_at').single();
    if (error) throw new Error(error.message);
    return view;
  });

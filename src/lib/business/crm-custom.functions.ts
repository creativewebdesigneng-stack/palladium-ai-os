import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = { from: (table: string) => any };
const fieldType = z.enum(["text", "number", "date", "boolean", "select", "multi_select", "url", "email", "phone"]);
const jsonRecord = z.record(z.string(), z.unknown());

export const getCrmCustomisation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [fields, views] = await Promise.all([
      sb.from("crm_field_definitions").select("id,key,label,field_type,options,required,sort_order,is_active,created_at,updated_at").eq("user_id", context.userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      sb.from("crm_saved_views").select("id,name,filters,columns,sort_config,is_default,created_at,updated_at").eq("user_id", context.userId).order("created_at", { ascending: false }),
    ]);
    if (fields.error) throw new Error(fields.error.message);
    if (views.error) throw new Error(views.error.message);
    return { fields: fields.data ?? [], views: views.data ?? [] };
  });

export const saveCrmFieldDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,62}$/),
    label: z.string().trim().min(1).max(120),
    fieldType,
    options: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
    required: z.boolean().optional(),
    sortOrder: z.number().int().min(-10000).max(10000).optional(),
    isActive: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      user_id: context.userId,
      key: data.key,
      label: data.label,
      field_type: data.fieldType,
      options: data.options ?? [],
      required: data.required ?? false,
      sort_order: data.sortOrder ?? 0,
      is_active: data.isActive ?? true,
    };
    const query = data.id
      ? sb.from("crm_field_definitions").update(row).eq("id", data.id).eq("user_id", context.userId)
      : sb.from("crm_field_definitions").insert(row);
    const { data: saved, error } = await query.select("id,key,label,field_type,options,required,sort_order,is_active,created_at,updated_at").single();
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: data.id ? "crm_field_updated" : "crm_field_created", targetType: "crm_field_definition", targetId: saved.id, metadata: { key: saved.key, type: saved.field_type } });
    return saved;
  });

export const deleteCrmFieldDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("crm_field_definitions").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: "crm_field_deleted", targetType: "crm_field_definition", targetId: data.id });
    return { ok: true };
  });

export const updateCrmContactCustomValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ contactId: z.string().uuid(), values: jsonRecord }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: definitions, error: defError } = await sb.from("crm_field_definitions").select("key,field_type,required,options,is_active").eq("user_id", context.userId).eq("is_active", true);
    if (defError) throw new Error(defError.message);
    const allowed = new Set((definitions ?? []).map((field: any) => field.key));
    const unknown = Object.keys(data.values).filter((key) => !allowed.has(key));
    if (unknown.length) throw new Error(`Unknown CRM custom field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`);
    const { data: contact, error } = await sb.from("crm_contacts").update({ custom_values: data.values }).eq("id", data.contactId).eq("user_id", context.userId).select("id,name,custom_values").single();
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: "crm_contact_custom_values_updated", targetType: "crm_contact", targetId: data.contactId, metadata: { fields: Object.keys(data.values) } });
    return contact;
  });

export const saveCrmView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120),
    filters: jsonRecord.optional(),
    columns: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
    sortConfig: jsonRecord.optional(),
    isDefault: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.isDefault) {
      const { error: resetError } = await sb.from("crm_saved_views").update({ is_default: false }).eq("user_id", context.userId).eq("is_default", true);
      if (resetError) throw new Error(resetError.message);
    }
    const row = { user_id: context.userId, name: data.name, filters: data.filters ?? {}, columns: data.columns ?? [], sort_config: data.sortConfig ?? {}, is_default: data.isDefault ?? false };
    const query = data.id ? sb.from("crm_saved_views").update(row).eq("id", data.id).eq("user_id", context.userId) : sb.from("crm_saved_views").insert(row);
    const { data: saved, error } = await query.select("id,name,filters,columns,sort_config,is_default,created_at,updated_at").single();
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: data.id ? "crm_view_updated" : "crm_view_created", targetType: "crm_saved_view", targetId: saved.id });
    return saved;
  });

export const deleteCrmView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("crm_saved_views").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

import {
  composeSelectedCallObjective,
  type SelectedCallProject,
  type SelectedCallCompany,
} from './call-context';

type Sb = { from: (name: string) => any };

/**
 * Selection is an explicit per-call disclosure choice. Re-load authorised
 * records on the server: never trust browser-supplied project/company text.
 * Service-role clients MUST use user-id and personal-workspace boundaries.
 */
export async function resolveSelectedCallContext(args: {
  sb: Sb;
  userId: string;
  objective: string;
  projectId?: string | undefined;
  companyWorkspaceId?: string | undefined;
}) {
  const projectRequest = args.projectId
    ? args.sb.from('projects')
      .select('id,name,status,priority,due_at,description,tags')
      .eq('id', args.projectId).eq('user_id', args.userId).is('org_id', null)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const companyRequest = args.companyWorkspaceId
    ? args.sb.from('company_workspaces')
      .select('id,name,industry,stage,geography,mission,priorities')
      .eq('id', args.companyWorkspaceId).eq('user_id', args.userId)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [projectResult, companyResult] = await Promise.all([projectRequest, companyRequest]);
  if (args.projectId && (projectResult.error || !projectResult.data)) {
    throw new Error('Selected personal project is unavailable or access was denied.');
  }
  if (args.companyWorkspaceId && (companyResult.error || !companyResult.data)) {
    throw new Error('Selected company workspace is unavailable or access was denied.');
  }
  const project = projectResult.data as SelectedCallProject | null;
  const company = companyResult.data as SelectedCallCompany | null;
  return {
    objective: composeSelectedCallObjective({ objective: args.objective, project, company }),
    projectId: project?.id ?? null,
    companyWorkspaceId: company?.id ?? null,
  };
}

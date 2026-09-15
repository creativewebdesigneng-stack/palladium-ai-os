import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any };
const uuid = z.string().uuid();

const sum = (rows: any[], key: string) =>
  rows.reduce((total, row) => total + Number(row[key] || 0), 0);

export const getConstructionPortfolioAnalytics = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z.object({ workspace_id: uuid }).parse(value),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const workspaceId = data.workspace_id;

    const [
      projectsResult,
      issuesResult,
      packagesResult,
      changesResult,
      tasksResult,
      materialsResult,
      reliabilityResult,
      reportsResult,
    ] = await Promise.all([
      sb.from('construction_projects').select('id,name,status,budget,actual_cost,start_date,target_end_date').eq('workspace_id', workspaceId).limit(2000),
      sb.from('construction_issues').select('id,project_id,issue_type,severity,status,due_at').eq('workspace_id', workspaceId).limit(2000),
      sb.from('construction_work_packages').select('id,project_id,status,percent_complete,budget,committed_cost,actual_cost,planned_finish').eq('workspace_id', workspaceId).limit(2000),
      sb.from('construction_changes').select('id,project_id,status,cost_impact,time_impact_days').eq('workspace_id', workspaceId).limit(2000),
      sb.from('construction_schedule_tasks').select('id,project_id,status,percent_complete,is_critical,planned_finish').eq('workspace_id', workspaceId).limit(2000),
      sb.from('construction_materials').select('id,project_id,status,required_qty,delivered_qty,required_by').eq('workspace_id', workspaceId).limit(2000),
      sb.from('construction_reliability_events').select('id,asset_id,event_type,downtime_minutes,cost,occurred_at').eq('workspace_id', workspaceId).limit(2000),
      sb.from('construction_reports').select('id,project_id,report_type,status,created_at').eq('workspace_id', workspaceId).limit(2000),
    ]);

    const results = [
      projectsResult, issuesResult, packagesResult, changesResult,
      tasksResult, materialsResult, reliabilityResult, reportsResult,
    ];
    const failed = results.find((result: any) => result.error);
    if (failed?.error) throw new Error(failed.error.message);

    const projects = projectsResult.data ?? [];
    const issues = issuesResult.data ?? [];
    const packages = packagesResult.data ?? [];
    const changes = changesResult.data ?? [];
    const tasks = tasksResult.data ?? [];
    const materials = materialsResult.data ?? [];
    const reliability = reliabilityResult.data ?? [];
    const reports = reportsResult.data ?? [];
    const today = new Date().toISOString().slice(0, 10);

    const rows = projects.map((project: any) => {
      const projectIssues = issues.filter((x: any) => x.project_id === project.id);
      const projectPackages = packages.filter((x: any) => x.project_id === project.id);
      const projectChanges = changes.filter((x: any) => x.project_id === project.id);
      const projectTasks = tasks.filter((x: any) => x.project_id === project.id);
      const projectMaterials = materials.filter((x: any) => x.project_id === project.id);

      const budget = Number(project.budget || 0);
      const actual = Number(project.actual_cost || 0) + sum(projectPackages, 'actual_cost');
      const openPackages = projectPackages.filter((x: any) => x.status !== 'complete');
      const openChanges = projectChanges.filter((x: any) => !['rejected', 'closed'].includes(x.status));
      const forecast = actual + sum(openPackages, 'committed_cost') + sum(openChanges, 'cost_impact');

      let progress = 0;
      if (projectPackages.length > 0) {
        progress = sum(projectPackages, 'percent_complete') / projectPackages.length;
      } else if (projectTasks.length > 0) {
        progress = sum(projectTasks, 'percent_complete') / projectTasks.length;
      }

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        budget,
        actual,
        forecast,
        variance: budget - forecast,
        progress,
        openRisks: projectIssues.filter(
          (x: any) => ['high', 'critical'].includes(x.severity) && !['resolved', 'closed'].includes(x.status),
        ).length,
        lateTasks: projectTasks.filter(
          (x: any) => x.planned_finish && x.planned_finish < today && !['complete', 'cancelled'].includes(x.status),
        ).length,
        supplyRisks: projectMaterials.filter(
          (x: any) =>
            x.status === 'shortage' ||
            (x.required_by &&
              x.required_by <= today &&
              Number(x.delivered_qty) < Number(x.required_qty)),
        ).length,
      };
    });

    const score = (row: any) =>
      row.openRisks * 10 +
      row.lateTasks * 5 +
      row.supplyRisks * 4 +
      (row.forecast > row.budget ? 8 : 0);

    return {
      projects: rows,
      portfolio: {
        budget: sum(rows, 'budget'),
        forecast: sum(rows, 'forecast'),
        variance: sum(rows, 'variance'),
        avgProgress: rows.length > 0 ? sum(rows, 'progress') / rows.length : 0,
        highRiskIssues: issues.filter(
          (x: any) => ['high', 'critical'].includes(x.severity) && !['resolved', 'closed'].includes(x.status),
        ).length,
        criticalTasks: tasks.filter(
          (x: any) => x.is_critical && !['complete', 'cancelled'].includes(x.status),
        ).length,
        downtimeHours: sum(reliability, 'downtime_minutes') / 60,
        reliabilityCost: sum(reliability, 'cost'),
        reportsAwaitingReview: reports.filter((x: any) => ['draft', 'review'].includes(x.status)).length,
      },
      ranked: [...rows].sort((a: any, b: any) => score(b) - score(a)),
    };
  });

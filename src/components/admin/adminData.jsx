// Static navigation only. Platform metrics, charts, health and audit activity
// are loaded from the live admin backend in the screens that render them.
export const QUICK_ACTIONS = [
  { label:'Manage Users', path:'/admin/users', icon:'Users' },
  { label:'Manage Plans', path:'/admin/subscriptions', icon:'CreditCard' },
  { label:'Manage Integrations', path:'/admin/integrations', icon:'Plug' },
  { label:'System Settings', path:'/admin/system-settings', icon:'Settings' },
  { label:'Security', path:'/admin/security', icon:'ShieldCheck' },
  { label:'Audit Logs', path:'/admin/audit-logs', icon:'ScrollText' },
];

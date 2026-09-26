import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Gauge, User, ShieldAlert, ShoppingBag, Brain, ListChecks, ScrollText, Bell, Briefcase, Network } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import BlackstarCommandDeck from '@/components/mission/BlackstarCommandDeck';
import CommandTheatre from '@/components/mission/CommandTheatre';
import BriefingConsole from '@/components/mission/BriefingConsole';
import OrchestratorConsole from '@/components/mission/OrchestratorConsole';
import ProfessionalPanel from '@/components/mission/ProfessionalPanel';
import ApprovalCentre from '@/components/mission/ApprovalCentre';
import PersonalAISection from '@/components/mission/PersonalAISection';
import AgentBuilder from '@/components/mission/AgentBuilder';
import MemoryVault from '@/components/mission/MemoryVault';
import ShoppingWorkspace from '@/components/mission/ShoppingWorkspace';
import TaskBoard from '@/components/mission/TaskBoard';
import SignalsPanel from '@/components/mission/SignalsPanel';
import { DEFAULT_ALLOWED_DOMAINS } from '@/lib/mission/catalog';
import { friendlyMessage } from '@/lib/errors';
import { useAuth } from '@/lib/AuthContext';
import {
  getMissionOverview,
  savePersonalAgent,
  deletePersonalAgent,
  submitPersonalTask,
  decideApproval,
  chooseAlternative,
  confirmPurchase,
  saveMemory,
  deleteMemory,
  updateTaskStatus,
  markNotifications,
  clearMemoryCategory,
} from '@/lib/mission/mission.functions';
import { submitMissionDiscovery } from '@/lib/mission/mission.discovery.functions';
import { decideEmailApproval } from '@/lib/mission/email-approval.functions';
import { decideExternalActionApproval, retryExternalApprovedAction } from '@/lib/mission/external-action-approval.functions';
import { decideWorkflowApprovalRequest } from '@/lib/runtime/workforce.functions';
import { runOrchestrator } from '@/lib/runtime/orchestrator.functions';

const TABS = [
  ['overview', 'Overview', Gauge],
  ['orchestrator', 'Orchestrator', Network],
  ['personal', 'Personal AI', User],
  ['professional', 'Professional AI', Briefcase],
  ['approvals', 'Approval centre', ShieldAlert],
  ['shopping', 'Live Explorer', ShoppingBag],
  ['tasks', 'Tasks', ListChecks],
  ['signals', 'Notifications & usage', Bell],
  ['memory', 'Memory', Brain],
  ['audit', 'Audit trail', ScrollText],
];

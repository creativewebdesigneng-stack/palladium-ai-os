import { describe, expect, it } from 'vitest';
import { buildOpportunityActionCards, inferOpportunityKind, signalsFromGoalPortfolio } from './opportunity-actions';

describe('Blackstar Autonomous OS opportunity planning',()=>{
  const goal={
    id:'goal-1',
    name:'Launch regional growth',
    objective:'Expand revenue into a new market while preserving approval gates.',
    status:'active',
    autonomy_level:'guarded',
    trigger_type:'manual',
    budget_pence:25000,
    scheduler_attempts:0,
  };

  it('derives bounded signals from persisted goal/run state',()=>{
    expect(inferOpportunityKind(goal,null)).toBe('market');
    const signals=signalsFromGoalPortfolio([goal],[{goal_id:'goal-1',status:'failed',error:'provider unavailable'}]);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.kind).toBe('risk');
    expect(signals[0]?.evidence).toContain('run:failed');
  });

  it('fails closed as unroutable when the owner has no existing executable capabilities',()=>{
    const cards=buildOpportunityActionCards({tenantId:'user-1',actorId:'user-1',goals:[goal],runs:[],capabilities:[],maximumRecommendations:6});
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]?.routingStatus).toBe('unroutable');
    expect(cards[0]?.plan).toBeNull();
  });
});

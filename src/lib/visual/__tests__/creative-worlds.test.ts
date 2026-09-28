import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const cinemaScreen=readFileSync(new URL('../../../screens/CinemaStudio.jsx',import.meta.url),'utf8');
const cinemaWorld=readFileSync(new URL('../../../components/cinema/CinemaProductionWorld.jsx',import.meta.url),'utf8');
const gameScreen=readFileSync(new URL('../../../screens/GameFoundry.jsx',import.meta.url),'utf8');
const gameWorld=readFileSync(new URL('../../../components/game-foundry/GameFoundryWorld.jsx',import.meta.url),'utf8');

describe('Blackstar creative visual worlds',()=>{
  it('drives Cinema visuals from persisted projects and real capability flags',()=>{
    expect(cinemaScreen).toContain('<CinemaProductionWorld capabilities={cap} projects={projects} />');
    expect(cinemaWorld).toContain('capabilities?.masterConfigured===true');
    expect(cinemaWorld).toContain('capabilities?.renderConfigured===true');
    expect(cinemaWorld).toContain('projects.filter((project)=>ACTIVE.has(project.status))');
  });

  it('drives Game Foundry visuals from real projects, assets and integration state',()=>{
    expect(gameScreen).toContain('capabilities={caps} projects={projects} assets={assets} integrations={integrations}');
    expect(gameWorld).toContain('integrations.filter((item)=>item.bridgeConfigured)');
    expect(gameWorld).toContain("capabilities?.assetGeneration?.configuredProvider");
    expect(gameWorld).toContain("capabilities?.gameGeneration?.nativeCompiler");
  });

  it('does not animate inactive work and respects reduced motion',()=>{
    expect(cinemaWorld).toContain('useReducedMotion');
    expect(cinemaWorld).toContain('reduced||!live?undefined');
    expect(gameWorld).toContain('useReducedMotion');
    expect(gameWorld).toContain('reduced||!live?undefined');
  });
});

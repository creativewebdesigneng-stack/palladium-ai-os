/**
 * Source-aware catalogue of the seven archives reviewed on 2026-10-13.
 *
 * References are DISCOVERY / CANDIDATE metadata, not installed capabilities,
 * not executable tools, and not proof that upstream runtimes are connected.
 * The 177 slugs were checked against the user's scientific-agent-skills archive.
 * Do not import upstream code into runtime bundles or run untrusted scripts.
 */
export type ExternalArchiveSource = {
  id: string;
  name: string;
  license: string;
  url: string;
  integratesWith: readonly string[];
  summary: string;
  status: 'reference' | 'review-required' | 'external-worker';
};

export const EXTERNAL_ARCHIVE_SOURCES: readonly ExternalArchiveSource[] = [
  {
    id: 'openviking', name: 'OpenViking', license: 'AGPL-3.0',
    url: 'https://github.com/volcengine/OpenViking',
    integratesWith: ['Memory Fabric', 'Knowledge', 'AI Hub', 'MCP'],
    summary: 'Hierarchical agent context database and retrieval of knowledge, memory and skill resources. Separate sidecar requires tenancy, auth and AGPL network-service licence review.',
    status: 'review-required',
  },
  {
    id: 'agentmemory', name: 'AgentMemory', license: 'Apache-2.0',
    url: 'https://github.com/rohitg00/agentmemory',
    integratesWith: ['Memory Fabric', 'Agents', 'MCP'],
    summary: 'Persistent episodic/semantic memory, hybrid recall, context consolidation, history and MCP. Connect through governed memory/MCP scope without replacing Blackstar memory records.',
    status: 'external-worker',
  },
  {
    id: 'browser-use', name: 'Browser Use', license: 'MIT',
    url: 'https://github.com/browser-use/browser-use',
    integratesWith: ['Browser Agent', 'Workforce', 'Mission Control'],
    summary: 'Agent-operated browser navigation, interaction, form actions and extraction. A separate isolated worker must obey Blackstar domain, approval and payment policy.',
    status: 'external-worker',
  },
  {
    id: 'scientific-agent-skills', name: 'Scientific Agent Skills', license: 'MIT',
    url: 'https://github.com/K-Dense-AI/scientific-agent-skills',
    integratesWith: ['Skills Registry', 'Research', 'Health', 'Industry'],
    summary: '177 individual research and scientific skill guides; dependencies, API credentials and lab permissions remain separate. Import candidates disabled until scanned and certified.',
    status: 'reference',
  },
  {
    id: 'diagram-design', name: 'Diagram Design', license: 'MIT',
    url: 'https://github.com/cathrynlavery/diagram-design',
    integratesWith: ['Skills Registry', 'Design Studio', 'Website Studio', 'Research'],
    summary: 'One comprehensive diagram-authoring skill for vector/HTML diagrams, layout patterns, branded visuals and export. Requires a reviewed rendering worker.',
    status: 'reference',
  },
  {
    id: 'harness-extended', name: 'Awesome Harness Engineering (extended)', license: 'CC0-1.0',
    url: 'https://github.com/',
    integratesWith: ['Agent Orchestrator', 'Workforce', 'Evaluations', 'Approvals'],
    summary: 'Educational collection of agent loop, context, MCP, safe autonomy, CI, sandbox, tracing and operational design references, not a runtime.',
    status: 'reference',
  },
  {
    id: 'harness-compact', name: 'Awesome Harness Engineering (compact)', license: 'CC0-1.0',
    url: 'https://github.com/',
    integratesWith: ['General Intelligence Kernel', 'Observability', 'Certification'],
    summary: 'A second harness architecture reference collection: specifications, tool boundaries, memory, evaluations and reliable agent operations. Not an executable tool.',
    status: 'reference',
  },
] as const;

// All 177 existing SKILL.md directory identifiers; keep them in their original
// source namespace, rather than overwriting built-in 160-skill procedures.
const SCIENTIFIC_SKILL_SLUGS = `
13c-metabolic-flux adaptyv aeon alphagenome analytical-method-validation anndata arbor arboreto astropy autoskill
benchling-integration bgpt-paper-search bids biopython bioservices bulk-rnaseq cantera cellprofiler cellxgene-census cirq
citation-management clinical-decision-support clinical-reports cobrapy consciousness-council dask database-lookup datalad
datamol deepchem deepspot-m deeptools depmap dhdna-profiler diffdock dnanexus-integration esm etetoolkit exa-search
experimental-design exploratory-data-analysis fictiv flowio flowkit fluidsim folklore-variant-evidence generate-image
geniml genomic-coordinates genomic-intelligence geomaster geopandas get-available-resources gget ginkgo-cloud-lab
glycoengineering gtars histolab hugging-science hypogenic hypothesis-generation imaging-data-commons infographics
iso-standards-readiness lab-hardware-cad labarchive-integration lamindb latchbio-integration latex-posters liteparse
literature-review mageck marine-carbonate-chemistry markdown-mermaid-writing market-research-reports markitdown matchms
matlab matplotlib medchem modal molecular-dynamics molfeat ncats-arax networkx neurokit2 neuropixels-analysis nextflow
nmrglue nwb-conversion omero-integration onekgpd ontology-term-resolution open-notebook openpiv opentrons-integration
optimize-for-gpu pacsomatic paper-lookup paperclip paperzilla parallel-web pathml pathogen-variant-surveillance
pathway-enrichment peer-review pennylane phylogenetics pi-agent pkpd-modeling polars polars-bio pptx-posters primekg
primer-design protocolsio-integration pufferlib pybamm pycalphad pydeseq2 pydicom pyhealth pylabrobot pymatgen pymc
pymoo pyopenms pysam pytdc pytorch-lightning pyzotero qiime2-amplicon qiskit qutip rdkit relion
relsa-severity-assessment research-grants research-lookup rowan scanpy scholar-evaluation scientific-brainstorming
scientific-critical-thinking scientific-schematics scientific-slides scientific-visualization scientific-writing
scikit-bio scikit-learn scikit-survival scvelo scvi-tools seaborn shap simpy stable-baselines3 statistical-analysis
statistical-power statsmodels sympy tamarind tellurium tiledbvcf timesfm-forecasting torch-geometric torchdrug
transformers treatment-plans umap-learn uncertainty-and-units usfiscaldata vaex venue-templates waypoint-bio
what-if-oracle zarr-python
`.trim().split(/\s+/);

export type ExternalSkillCandidate = {
  sourceId: 'scientific-agent-skills' | 'diagram-design';
  slug: string;
  id: string;
  title: string;
  category: string;
  license: 'MIT';
  sourceUrl: string;
  requiresReview: boolean;
  status: 'candidate';
};

const HIGH_STAKES = /clinical|treatment|medical|health|pathogen|genom|dna|bio|lab|pacs|pharmac|molecul|scientific|research/i;
const title = (slug: string) => slug.split('-').map(word => word.length < 4 ? word.toUpperCase() : word[0]!.toUpperCase() + word.slice(1)).join(' ');

export const UPSTREAM_SKILL_REVISIONS = {
  'scientific-agent-skills': 'a1043ef544e3a100c28e70a736b6cf32554d0677',
  'diagram-design': '0a8ea20ae69b33a5edce6018eedd3a9d26e90c1c',
} as const;

export const EXTERNAL_SKILL_CANDIDATES: readonly ExternalSkillCandidate[] = [
  ...SCIENTIFIC_SKILL_SLUGS.map((slug): ExternalSkillCandidate => ({
    sourceId: 'scientific-agent-skills', slug, id: `scientific-agent-skills:${slug}`, title: title(slug),
    category: /clinical|treatment|health|patient|medical/.test(slug) ? 'Health / Clinical' :
      /genom|dna|bio|molecul|cell|protein|pathogen|lab|primer/.test(slug) ? 'Bioinformatics / Lab' :
      /stat|data|polars|dask|time|forecast|sklearn|scikit|regression/.test(slug) ? 'Data / Statistics' :
      /research|paper|citation|literature|review|academic|writing|venue/.test(slug) ? 'Research / Publishing' :
      'Science / Engineering',
    license: 'MIT',
    sourceUrl: `https://github.com/K-Dense-AI/scientific-agent-skills/blob/${UPSTREAM_SKILL_REVISIONS['scientific-agent-skills']}/skills/${slug}/SKILL.md`,
    requiresReview: HIGH_STAKES.test(slug),
    status: 'candidate',
  })),
  {
    sourceId: 'diagram-design', slug: 'diagram-design', id: 'diagram-design:diagram-design',
    title: 'Diagram Design', category: 'Design / Visualization', license: 'MIT',
    sourceUrl: `https://github.com/cathrynlavery/diagram-design/blob/${UPSTREAM_SKILL_REVISIONS['diagram-design']}/skills/diagram-design/SKILL.md`,
    requiresReview: true, status: 'candidate',
  },
] as const;

export function externalSkillCandidate(sourceId: string, slug: string) {
  return EXTERNAL_SKILL_CANDIDATES.find(item => item.sourceId === sourceId && item.slug === slug) ?? null;
}

export function externalSourceStats() {
  return {archives: EXTERNAL_ARCHIVE_SOURCES.length, scientificSkills: SCIENTIFIC_SKILL_SLUGS.length,
    diagramSkills: 1, candidates: EXTERNAL_SKILL_CANDIDATES.length };
}

import { describe, expect, it } from 'vitest';
import {
  authorisedOrgKnowledgeDocuments, buildOrgKnowledgeEvidencePacket,
  type OrgKnowledgeDocument, type OrgKnowledgeChunk,
} from '../org-knowledge-evidence';
const org = 'org-a', other = 'org-b';
const document = (patch: Partial<OrgKnowledgeDocument> = {}): OrgKnowledgeDocument => ({
  id:'doc-1', user_id:'owner-a',org_id:org,agent_id:null,
  title:'Return policy',status:'ready',metadata:{enterprise_shared:true},...patch,
});
const chunk = (patch: Partial<OrgKnowledgeChunk> = {}): OrgKnowledgeChunk => ({
  id:'chunk-1',document_id:'doc-1',user_id:'owner-a',org_id:org,agent_id:null,
  content:'Returns require a receipt within thirty days.',...patch,
});
const auth = (requestedIds=['doc-1'],rows=[document()],orgId=org,role='member') =>
  authorisedOrgKnowledgeDocuments({requestedIds,rows,orgId,role});

describe('Explicit organisation knowledge authorisation',() => {
  it('accepts the exact ready, opt-in doc for an active member role',()=>{
    expect(auth().get('doc-1')?.title).toBe('Return policy');
    expect(auth(['doc-1'],[document()],org,'owner').size).toBe(1);
    expect(auth(['doc-1'],[document()],org,'admin').size).toBe(1);
  });
  it('rejects missing, duplicate, too many or unapproved requested documents',()=>{
    expect(()=>auth(['doc-1'],[])).toThrow('unavailable');
    expect(()=>auth(['doc-1','doc-1'])).toThrow('unavailable');
    expect(()=>auth([])).toThrow('unavailable');
    expect(()=>auth(['1','2','3','4'])).toThrow('unavailable');
    expect(()=>auth(['doc-1'],[document()],org,'viewer')).toThrow('unavailable');
  });
  it('never reads a different org, pending doc, agent doc or malformed sharing flag',()=>{
    for (const row of [
      document({org_id:other}),document({org_id:null}),document({status:'processing'}),
      document({agent_id:'agent-2'}),document({metadata:{enterprise_shared:'true'}}),
      document({metadata:{enterprise_shared:false}}),document({metadata:null}),
    ]) expect(()=>auth(['doc-1'],[row])).toThrow('unavailable');
  });
  it('uses selected ids rather than authorising an entire workspace batch',()=>{
    expect(()=>auth(['doc-1','doc-2'],[document(),document({id:'doc-2',org_id:other})])).toThrow('unavailable');
  });
  it('returns only owner-and-org matching cited lexical extracts',()=>{
    const packet=buildOrgKnowledgeEvidencePacket({
      documents:auth(),orgId:org,question:'What is the returns receipt policy?',
      chunks:[chunk(),chunk({id:'wrong-owner',user_id:'owner-b'}),chunk({id:'wrong-org',org_id:other}),
        chunk({id:'wrong-doc',document_id:'doc-2'}),chunk({id:'wrong-agent',agent_id:'agent-1'})],
    });
    expect(packet.evidenceOnly).toBe(true);
    expect(packet.answerGenerated).toBe(false);
    expect(packet.status).toBe('retrieved_excerpts');
    expect(packet.excerpts).toHaveLength(1);
    expect(packet.excerpts[0]?.citation).toBe('document:doc-1#chunk:chunk-1');
    expect(packet.excerpts[0]?.similarity).toBeNull();
    expect(packet.matchedDocumentCount).toBe(1);
  });
  it('never claims no matching passages means no correct answer',()=>{
    const packet=buildOrgKnowledgeEvidencePacket({documents:auth(),orgId:org,
      question:'What is the supplier cyber breach procedure?',chunks:[chunk()]});
    expect(packet.status).toBe('no_authorised_excerpts');
    expect(packet.excerpts).toHaveLength(0);
    expect(packet.limitation).toContain('lack of matches');
  });
  it('caps citations, excerpt length, and duplicate references',()=>{
    const packet=buildOrgKnowledgeEvidencePacket({documents:auth(),orgId:org,
      question:'Where is the returns receipt policy?',chunks:[
        ...Array.from({length:18},(_,i)=>chunk({id:'c-'+i,content:'Receipt policy '+('X'.repeat(2000))})),
        chunk({id:'c-0',content:'Receipt policy duplicate'})]});
    expect(packet.excerpts).toHaveLength(8);
    expect(packet.excerpts.every(x=>x.excerpt.length<=900)).toBe(true);
    expect(new Set(packet.excerpts.map(x=>x.citation)).size).toBe(8);
  });
});

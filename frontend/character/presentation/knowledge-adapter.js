// Read-only integration with EXISTING Knowledge APIs. The caller supplies the
// established session-aware request function; this module owns no credentials.
export const SOP_EXPORT_BLOCKERS = Object.freeze([
  'No complete versioned SOP content contract (ordered instructions, warnings and section/page references).',
  'No authorized script-review and approval contract bound to the source version and script digest.',
  'No authorized generated-video storage/export contract or source-revalidation operation.'
]);
export function createKnowledgeAdapter({request,api,isCurrent}) {
  if(typeof request!=='function'||typeof isCurrent!=='function'||typeof api!=='string')throw new TypeError('Existing authorized session adapter required');
  return Object.freeze({
    async listApprovedDocuments(){
      if(!isCurrent())throw new Error('Current authorized session required');
      const data=await request(api+'/knowledge/documents');
      if(!isCurrent())throw new Error('Session changed; discard document results');
      if(!Array.isArray(data?.documents))throw new Error('Invalid Knowledge document response');
      return data.documents.filter(d=>d.knowledge_state==='APPROVED').map(d=>({
        id:d.id,title:d.filename,reviewedAt:d.knowledge_reviewed_at??null,
        // Review time is not a document version; approval is not script approval.
        version:null,canGenerateVideo:false
      }));
    },
    prepareVideo(){throw new Error('SOP video generation blocked: '+SOP_EXPORT_BLOCKERS.join(' '));}
  });
}

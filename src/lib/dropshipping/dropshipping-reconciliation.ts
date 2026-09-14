type Row=Record<string,unknown>;

const RANK:Record<string,number>={unfulfilled:0,picking:1,packed:2,shipped:3,ready_for_collection:3,collected:4,delivered:4,returned:5};

export function isSafeDropshipFulfilmentTransition(current:unknown,next:unknown){
  const from=String(current??'unfulfilled');
  const to=String(next??'');
  if(!(to in RANK))return false;
  if(from===to)return true;
  if(to==='returned')return ['shipped','delivered','collected','returned'].includes(from);
  if(from==='returned')return false;
  return (RANK[to]??-1)>=(RANK[from]??0);
}

export function boundedEvidenceResult(value:unknown){
  const serialized=JSON.stringify(value??null);
  if(serialized.length<=24_000)return value??null;
  return {truncated:true,preview:serialized.slice(0,24_000)};
}

export function evidenceSummary(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))return String(value??'').slice(0,500);
  const row=value as Row;
  const preferred=['status','tracking_number','trackingNumber','carrier','shipment_status','fulfilment_status','fulfillment_status'];
  const picked:Row={};
  for(const key of preferred)if(row[key]!==undefined)picked[key]=row[key];
  return Object.keys(picked).length?JSON.stringify(picked).slice(0,1000):JSON.stringify(row).slice(0,1000);
}

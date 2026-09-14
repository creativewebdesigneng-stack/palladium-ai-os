type Row=Record<string,unknown>;
type Alert={id:string;severity:'critical'|'high'|'medium'|'low';kind:string;title:string;detail:string;orderId?:string;itemId?:string};

const CLOSED_ORDER_STATUSES=new Set(['completed','cancelled','refunded']);
const CLOSED_FULFILMENT_STATUSES=new Set(['delivered','collected','returned']);
const OPEN_RETURN_STATUSES=new Set(['requested','approved','received']);
const severityRank={critical:4,high:3,medium:2,low:1} as const;

function asArray(value:unknown):Row[]{return Array.isArray(value)?value.filter((v):v is Row=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v)):[];}
function str(row:Row,key:string,fallback=''){const value=row[key];return value===null||value===undefined?fallback:String(value);}
function meta(row:Row):Row{const value=row['metadata'];return value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};}
function ts(value:unknown){const n=Date.parse(typeof value==='string'?value:'');return Number.isFinite(n)?n:0;}
function ageHours(value:unknown,now:number){const start=ts(value);return start?Math.max(0,(now-start)/3_600_000):0;}
function itemId(row:Row){return str(row,'item_id')||str(row,'catalog_item_id')||str(row,'product_id')||str(row,'id');}

export function isDropshipCatalogItem(row:Row){
  const metadata=meta(row);
  return metadata['source']==='dropshipping-hub'||metadata['businessModel']==='dropshipping'||metadata['business_model']==='dropshipping';
}

export function extractDropshipOrderItemIds(order:Row){
  return asArray(order['line_items']).map(itemId).filter(Boolean);
}

export function buildDropshippingControlTower(input:{catalog?:Row[];orders?:Row[];returns?:Row[];demandSignals?:Row[];reorderProposals?:Row[];now?:number}){
  const now=input.now??Date.now();
  const products=asArray(input.catalog).filter(isDropshipCatalogItem);
  const productIds=new Set(products.map(row=>str(row,'id')).filter(Boolean));
  const productById=new Map(products.map(row=>[str(row,'id'),row]));
  const allOrders=asArray(input.orders);
  const linkedOrders=allOrders.filter(order=>extractDropshipOrderItemIds(order).some(id=>productIds.has(id))||meta(order)['source']==='dropshipping-hub');
  const linkedOrderIds=new Set(linkedOrders.map(order=>str(order,'id')).filter(Boolean));
  const unlinkedMarketplaceOrders=allOrders.filter(order=>['online','marketplace','social'].includes(str(order,'channel'))&&!linkedOrderIds.has(str(order,'id'))&&extractDropshipOrderItemIds(order).every(id=>!productIds.has(id)));
  const openOrders=linkedOrders.filter(order=>!CLOSED_ORDER_STATUSES.has(str(order,'status')));
  const fulfilmentQueue=openOrders.filter(order=>!CLOSED_FULFILMENT_STATUSES.has(str(order,'fulfilment_status')));
  const linkedReturns=asArray(input.returns).filter(row=>linkedOrderIds.has(str(row,'order_id')));
  const openReturns=linkedReturns.filter(row=>OPEN_RETURN_STATUSES.has(str(row,'status')));
  const demandSignals=asArray(input.demandSignals).filter(row=>productIds.has(str(row,'item_id')));
  const reorderProposals=asArray(input.reorderProposals).filter(row=>productIds.has(str(row,'item_id')));
  const alerts:Alert[]=[];

  for(const order of fulfilmentQueue){
    const orderId=str(order,'id');
    const label=str(order,'order_number')||orderId||'Order';
    const fulfilment=str(order,'fulfilment_status','unfulfilled');
    const placedAge=ageHours(order['placed_at']??order['created_at'],now);
    if(fulfilment==='shipped'&&!str(order,'tracking_number').trim())alerts.push({id:`tracking:${orderId}`,severity:'critical',kind:'tracking-missing',title:`${label} shipped without tracking`,detail:'Add verified carrier/tracking evidence before customer messaging claims shipment visibility.',orderId});
    if(['unfulfilled','picking','packed'].includes(fulfilment)&&placedAge>=48)alerts.push({id:`late:${orderId}`,severity:placedAge>=96?'critical':'high',kind:'fulfilment-delay',title:`${label} has been open ${Math.floor(placedAge)}h`,detail:'Review supplier acceptance, stock, SLA and fulfilment handoff. External supplier/order actions remain approval-gated.',orderId});
    if(fulfilment==='shipped'&&ageHours(order['fulfilled_at']??order['updated_at']??order['placed_at'],now)>=168)alerts.push({id:`stale:${orderId}`,severity:'high',kind:'delivery-delay',title:`${label} has been shipped for 7+ days`,detail:'Check the connected carrier/provider before promising a delivery date or sending a delay message.',orderId});
  }

  for(const signal of demandSignals){
    const risk=str(signal,'risk','stable');
    if(!['critical','high','medium'].includes(risk))continue;
    const id=str(signal,'item_id');
    const product=productById.get(id);
    alerts.push({id:`stock:${id}`,severity:risk as 'critical'|'high'|'medium',kind:'supplier-stock-risk',title:`${str(product??{},'name',str(signal,'name','Product'))} stock cover is ${risk}`,detail:str(signal,'reason','Review supplier availability, lead time and reorder evidence.'),itemId:id});
  }

  for(const ret of openReturns){
    const id=str(ret,'id');
    const orderId=str(ret,'order_id');
    alerts.push({id:`return:${id}`,severity:str(ret,'status')==='received'?'high':'medium',kind:'return-open',title:`Return ${str(ret,'return_number')||id||'case'} needs attention`,detail:`Status: ${str(ret,'status','requested')}. Refund/provider side effects must only be marked complete after the authoritative payment/store system confirms them.`,...(orderId?{orderId}:{})});
  }

  alerts.sort((a,b)=>severityRank[b.severity]-severityRank[a.severity]||a.title.localeCompare(b.title));
  const supplierIds=new Set(products.map(row=>str(row,'supplier_id')).filter(Boolean));
  const grossRevenue=linkedOrders.filter(order=>['paid','authorised'].includes(str(order,'payment_status'))&&!['cancelled','refunded'].includes(str(order,'status'))).reduce((sum,order)=>sum+Number(order['total']??0),0);

  return {
    products,linkedOrders,openOrders,fulfilmentQueue,linkedReturns,openReturns,demandSignals,reorderProposals,alerts,unlinkedMarketplaceOrders,
    metrics:{
      products:products.length,suppliers:supplierIds.size,linkedOrders:linkedOrders.length,openOrders:openOrders.length,fulfilmentExceptions:alerts.filter(a=>['tracking-missing','fulfilment-delay','delivery-delay'].includes(a.kind)).length,
      openReturns:openReturns.length,criticalStockRisks:demandSignals.filter(s=>str(s,'risk')==='critical').length,highStockRisks:demandSignals.filter(s=>str(s,'risk')==='high').length,openReorders:reorderProposals.filter(r=>['suggested','approved'].includes(str(r,'status'))).length,
      unlinkedMarketplaceOrders:unlinkedMarketplaceOrders.length,grossRevenue:Math.round(grossRevenue*100)/100,
    },
  };
}

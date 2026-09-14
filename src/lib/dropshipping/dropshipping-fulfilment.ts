import {DROPSHIP_SUPPLIER_TARGETS} from './dropshipping-readiness';
import {extractDropshipOrderItemIds} from './dropshipping-control-tower';

type Row=Record<string,unknown>;
const normalize=(value:string)=>value.trim().toLowerCase().replace(/^nango_/,'').replace(/_/g,'-');

export function isDropshipSupplierProvider(provider:string){
  const id=normalize(provider);
  return DROPSHIP_SUPPLIER_TARGETS.some(target=>target.providers.some(alias=>normalize(alias)===id));
}

export function buildDropshipFulfilmentTemplate(order:Row){
  const lineItems=Array.isArray(order['line_items'])?order['line_items'].slice(0,100):[];
  const shippingAddress=order['shipping_address']&&typeof order['shipping_address']==='object'&&!Array.isArray(order['shipping_address'])?order['shipping_address']:{};
  return {
    order_id:String(order['id']??'').slice(0,120),
    order_number:String(order['order_number']??'').slice(0,120),
    line_items:lineItems,
    shipping_address:shippingAddress,
    currency:String(order['currency']??'').slice(0,8),
    total:Number(order['total']??0)||0,
  };
}

export function dropshipOrderCatalogIds(order:Row){
  return [...new Set(extractDropshipOrderItemIds(order))].slice(0,100);
}

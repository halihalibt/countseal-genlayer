export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export function auditBundle(order,invoices){
 const n=order.lines.length;if(!n||order.invoice_ids.length!==invoices.length||new Set(order.invoice_ids).size!==invoices.length)throw Error('Incomplete invoice snapshot');
 const reserved=Array(n).fill(0),approved=Array(n).fill(0);
 invoices.forEach((inv,j)=>{if(inv.id!==order.invoice_ids[j]||inv.order_id!==order.id||inv.terms_hash!==order.terms_hash||inv.allocation.length!==n)throw Error('Invoice binding mismatch');
 if(!['SUBMITTED','RESERVED','APPROVED','BLOCKED','REVIEW_REQUIRED','WITHDRAWN','REJECTED'].includes(inv.state))throw Error('Unknown invoice state');
 if(inv.state==='RESERVED'||inv.state==='APPROVED'){
  if(!inv.mapping||inv.mapping.rows.length!==inv.lines.length)throw Error('Missing semantic map');const q=Array(n).fill(0);
  inv.mapping.rows.forEach((r,i)=>{if(r.status!=='MATCH'||!Number.isInteger(r.target)||r.target<0||r.target>=n||inv.lines[i].unit_price!==order.lines[r.target].unit_price||!inv.lines[i].description.includes(r.invoice_quote)||!order.lines[r.target].description.includes(r.order_quote))throw Error('Invalid reserved identity/price');q[r.target]+=inv.lines[i].quantity;});
  if(canonical(q)!==canonical(inv.allocation))throw Error('Allocation does not follow semantic map');
  inv.allocation.forEach((v,i)=>{if(!Number.isSafeInteger(v)||v<0)throw Error('Invalid quantity');(inv.state==='RESERVED'?reserved:approved)[i]+=v;});
 }});
 for(let i=0;i<n;i++)if(reserved[i]!==order.reserved[i]||approved[i]!==order.approved[i]||approved[i]+reserved[i]>order.received[i]||order.received[i]>order.lines[i].quantity||order.received[i]<0)throw Error('Quantity conservation mismatch');
 if(order.returns !== undefined || order.returned !== undefined){
  if(!order.returns || !Array.isArray(order.returned) || order.returned.length!==n)throw Error('Incomplete return ledger');
  const returned=Array(n).fill(0), gross=Array(n).fill(0);
  for(const [reference, record] of Object.entries(order.returns)){
   if(record.reference!==reference || record.order_id!==order.id || !['PROPOSED','CONFIRMED','DECLINED'].includes(record.state) || !Array.isArray(record.quantities) || record.quantities.length!==n || !record.quantities.some(v=>v>0))throw Error('Return binding mismatch');
   record.quantities.forEach((v,i)=>{
    if(!Number.isSafeInteger(v)||v<0)throw Error('Invalid return quantity');
    if(record.state==='CONFIRMED')returned[i]+=v;
   });
  }
  for(const event of order.events.filter(event=>event.action==='RECEIVE')){
   event.subject.quantities.forEach((v,i)=>{gross[i]+=v;});
  }
  if(canonical(returned)!==canonical(order.returned)||gross.some((v,i)=>v-returned[i]!==order.received[i]))throw Error('Return conservation mismatch');
 }
 return {reserved,approved,available:order.received.map((v,i)=>v-reserved[i]-approved[i])};
}
export function approvedCSV(order,invoices){auditBundle(order,invoices);const cell=v=>{const s=String(v);return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"'};const rows=[['invoice','PO item','description','quantity','currency','unit price minor','line total minor']];for(const inv of invoices.filter(i=>i.state==='APPROVED'))inv.lines.forEach((l,j)=>rows.push([inv.reference,inv.mapping.rows[j].target+1,l.description,l.quantity,order.currency,l.unit_price,l.quantity*l.unit_price]));return rows.map(r=>r.map(cell).join(',')).join('\r\n');}

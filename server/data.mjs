import fs from 'node:fs';import crypto from 'node:crypto';import {client,rpc} from '../scripts/network.mjs';import {auditBundle,canonical} from '../src/audit.mjs';
export const deployment=()=>JSON.parse(fs.readFileSync(new URL('../public/deployment.json',import.meta.url)));
let verifiedAt=0;
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
export async function verifyDeployment(){const d=deployment();if(d.chain_id!==61999||d.rpc!=='https://studio.genlayer.com/api')throw Error('Invalid deployment');if(Date.now()-verifiedAt>60000){if(Number(await rpc('eth_chainId',[]))!==61999)throw Error('Wrong chain');if(digest(await client.getContractCode(d.contract))!==d.source_sha256)throw Error('Source mismatch');verifiedAt=Date.now();}return d;}
export async function read(fn,args=[]){const d=await verifyDeployment();const result=JSON.parse(await client.readContract({address:d.contract,functionName:fn,args,transactionHashVariant:'latest-final'}));return {chain_id:61999,contract:d.contract,state_variant:'latest-final',read_at:new Date().toISOString(),result};}
export async function bundle(id){const first=await read('get_order',[id]);const order=first.result,invoices=[];for(const iid of order.invoice_ids)invoices.push((await read('get_invoice',[iid])).result);const second=(await read('get_order',[id])).result;if(second.revision!==order.revision)throw Error('Concurrent revision: retry');auditBundle(order,invoices);
if(deployment().protocol==='countseal-2'&&(!order.returns||!order.returned))throw Error('Missing finalized return ledger');
for(const {content_hash,state,...manifest} of Object.values(order.returns??{})){
 if(digest(canonical(manifest))!==content_hash)throw Error('Return manifest digest mismatch');
}
const terms={id:order.id,buyer:order.buyer,supplier:order.supplier,currency:order.currency,lines:order.lines};if(digest(canonical(terms))!==order.terms_hash||invoices.some(i=>digest(canonical(i.lines))!==i.content_hash))throw Error('Content hash mismatch');return {...first,result:{order,invoices}};}

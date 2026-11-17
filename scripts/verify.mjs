import fs from 'node:fs';import crypto from 'node:crypto';import {abi} from 'genlayer-js';import {client,rpc,stringify} from './network.mjs';import {executionOf,verifyReceiptIdentity} from '../src/receipt.mjs';import {auditBundle,canonical} from '../src/audit.mjs';
const d=JSON.parse(fs.readFileSync('public/deployment.json')),j=JSON.parse(fs.readFileSync('evidence/live.json'));
if(!j.completed_at)throw Error('Live acceptance is incomplete; refusing to certify it.');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),check=(ok,message)=>{if(!ok)throw Error(message)};
check(Number(await rpc('eth_chainId',[]))===61999&&d.chain_id===61999,'CHAIN_MISMATCH');
const source=fs.readFileSync('contracts/count_seal.py','utf8');check(hash(source)===d.source_sha256&&await client.getContractCode(d.contract)===source,'SOURCE_MISMATCH');
const expectedErrors={'reject-blocked-approval':'RESERVATION_REQUIRED','outsider-receipt':'BUYER_ONLY','over-receipt':'QUANTITY_CONSERVATION','stale-revision':'STALE_REVISION','invoice-reference-replay':'INVOICE_EXISTS','approved-replay':'INVOICE_TERMINAL'};
const out={verified_at:new Date().toISOString(),chain_id:61999,contract:d.contract,source_sha256:d.source_sha256,transactions:[],state_variant:'latest-final'};
for(const e of j.transactions){const r=await client.getTransaction({hash:e.hash});check(r.statusName==='FINALIZED','NOT_FINALIZED '+e.label);const execution=executionOf(r);check((execution==='SUCCESS')!==!!e.expected_failure,'UNEXPECTED_EXECUTION '+e.label);check(r.leader_only===false,'LEADER_ONLY '+e.label);
 if(e.method!=='deploy'){const data=abi.calldata.decode(Buffer.from(r.data.calldata.base64,'base64'));const decoded=data instanceof Map?Object.fromEntries(data):data;verifyReceiptIdentity(r,{...e,contract:d.contract},decoded);}else{check(r.from_address.toLowerCase()===e.sender&&r.data.contract_address.toLowerCase()===d.contract.toLowerCase(),'DEPLOY_IDENTITY');}
 let expected_error;if(e.expected_failure){expected_error=expectedErrors[e.label];check(!!expected_error,'Unknown negative test');const rounds=r.consensus_history?.consensus_results??[];const errors=rounds.flatMap(x=>x.leader_result??[]).filter(x=>x.mode==='leader').map(x=>x.genvm_result?.stderr?.trim().split('\n').at(-1));check(errors.some(x=>x==='Exception: '+expected_error),'WRONG_REJECTION_REASON '+e.label);}
 const votes=r.votes??r.consensus_data?.votes;check(votes&&Object.values(votes).filter(x=>x==='agree').length>=2,'NO_VALIDATOR_AGREEMENT '+e.label);
 out.transactions.push({label:e.label,hash:e.hash,status:r.statusName,execution,expected_failure:!!e.expected_failure,expected_error,leader_only:r.leader_only,votes});console.log(e.label,r.statusName,execution);
}
async function read(fn,args){return JSON.parse(await client.readContract({address:d.contract,functionName:fn,args,transactionHashVariant:'latest-final'}));}
const order=await read('get_order',[j.order_id]),invoices=[];for(const id of order.invoice_ids)invoices.push(await read('get_invoice',[id]));check((await read('get_order',[j.order_id])).revision===order.revision,'CONCURRENT_REVISION');
check(canonical(order)===canonical(j.readbacks['final-order']),'FINAL_STATE_CHANGED');auditBundle(order,invoices);
check(hash(canonical({id:order.id,buyer:order.buyer,supplier:order.supplier,currency:order.currency,lines:order.lines}))===order.terms_hash,'TERMS_HASH');
for(const inv of invoices){check(hash(canonical(inv.lines))===inv.content_hash,'CONTENT_HASH');check(canonical(inv)===canonical(j.readbacks['final-'+inv.reference]),'INVOICE_STATE_CHANGED');if(inv.mapping)check(hash(canonical({order:order.lines.map(x=>x.description),invoice:inv.lines.map(x=>x.description)}))===inv.basis_hash,'BASIS_HASH');}
Object.assign(out,{order,invoices,success_count:out.transactions.filter(x=>x.execution==='SUCCESS').length,expected_rejection_count:out.transactions.filter(x=>x.expected_failure).length});
fs.writeFileSync('evidence/verification.json',stringify(out));console.log('INDEPENDENT VERIFICATION COMPLETE');

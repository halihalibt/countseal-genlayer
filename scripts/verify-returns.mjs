import fs from 'node:fs';import crypto from 'node:crypto';import {abi} from 'genlayer-js';import {client,rpc,stringify} from './network.mjs';import {executionOf,verifyReceiptIdentity} from '../src/receipt.mjs';import {auditBundle,canonical} from '../src/audit.mjs';
const d=JSON.parse(fs.readFileSync('public/deployment.json')),j=JSON.parse(fs.readFileSync('evidence/returns-live.json'));
if(!j.completed_at)throw Error('Live acceptance is incomplete; refusing to certify it.');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),check=(ok,message)=>{if(!ok)throw Error(message)};
async function rateLimitedRead(operation){
 for(let attempt=0;attempt<4;attempt++){
  try{return await operation();}
  catch(error){
   if(attempt===3 || !/rate limit|429/i.test(String(error?.details ?? error?.message)))throw error;
   const retry=Number(error.cause?.data?.retry_after_seconds ?? 10);
   await new Promise(resolve=>setTimeout(resolve,Math.max(2,retry+1)*1000));
  }
 }
}
check(Number(await rateLimitedRead(()=>rpc('eth_chainId',[])))===61999&&d.chain_id===61999,'CHAIN_MISMATCH');
const source=fs.readFileSync('contracts/count_seal.py','utf8');check(hash(source)===d.source_sha256&&await rateLimitedRead(()=>client.getContractCode(d.contract))===source,'SOURCE_MISMATCH');
const expectedErrors={
 'damaged-bolts-outsider':'SUPPLIER_ONLY',
 'damaged-bolts-wrong-digest':'CONTENT_BINDING',
 'damaged-bolts-replay':'RETURN_NOT_PENDING',
 'reserved-conflict-capacity':'RETURN_EXCEEDS_AVAILABLE',
};
const out={verified_at:new Date().toISOString(),chain_id:61999,contract:d.contract,source_sha256:d.source_sha256,transactions:[],state_variant:'latest-final'};
for(const e of j.transactions){const r=await rateLimitedRead(()=>client.getTransaction({hash:e.hash}));check(r.statusName==='FINALIZED','NOT_FINALIZED '+e.label);const execution=executionOf(r);check((execution==='SUCCESS')!==!!e.expected_failure,'UNEXPECTED_EXECUTION '+e.label);check(r.leader_only===false,'LEADER_ONLY '+e.label);
 if(e.method!=='deploy'){const data=abi.calldata.decode(Buffer.from(r.data.calldata.base64,'base64'));const decoded=data instanceof Map?Object.fromEntries(data):data;verifyReceiptIdentity(r,{...e,contract:d.contract},decoded);}else{check(r.from_address.toLowerCase()===e.sender&&r.data.contract_address.toLowerCase()===d.contract.toLowerCase(),'DEPLOY_IDENTITY');}
 let expected_error;if(e.expected_failure){expected_error=expectedErrors[e.label];check(!!expected_error,'Unknown negative test');const rounds=r.consensus_history?.consensus_results??[];const errors=rounds.flatMap(x=>x.leader_result??[]).filter(x=>x.mode==='leader').map(x=>x.genvm_result?.stderr?.trim().split('\n').at(-1));check(errors.some(x=>x==='Exception: '+expected_error),'WRONG_REJECTION_REASON '+e.label);}
 const votes=r.votes??r.consensus_data?.votes;check(votes&&Object.values(votes).filter(x=>x==='agree').length>=2,'NO_VALIDATOR_AGREEMENT '+e.label);
 out.transactions.push({label:e.label,hash:e.hash,status:r.statusName,execution,expected_failure:!!e.expected_failure,expected_error,leader_only:r.leader_only,votes});console.log(e.label,r.statusName,execution);
}
async function read(fn,args){return JSON.parse(await rateLimitedRead(()=>client.readContract({address:d.contract,functionName:fn,args,transactionHashVariant:'latest-final'})));}
const readbacks={};
for(const name of ['workshop-final','facilities-final','depot-final']){
 const snapshot=j.readbacks[name];
 const order=await read('get_order',[snapshot.id]);
 check(canonical(order)===canonical(snapshot),'FINAL_STATE_CHANGED '+name);
 const invoices=[];
 for(const id of order.invoice_ids){
  const invoice=await read('get_invoice',[id]);
  check(canonical(invoice)===canonical(j.readbacks[invoice.reference]),'INVOICE_STATE_CHANGED');
  check(hash(canonical(invoice.lines))===invoice.content_hash,'INVOICE_CONTENT_HASH');
  invoices.push(invoice);
 }
 auditBundle(order,invoices);
 for(const {state,content_hash,...manifest} of Object.values(order.returns)){
  check(hash(canonical(manifest))===content_hash,'RETURN_CONTENT_HASH');
 }
 readbacks[name]={order,invoices};
}
Object.assign(out,{readbacks,success_count:out.transactions.filter(x=>x.execution==='SUCCESS').length,expected_rejection_count:out.transactions.filter(x=>x.expected_failure).length});
fs.writeFileSync('evidence/returns-verification.json',stringify(out));
console.log('RETURNS INDEPENDENT VERIFICATION COMPLETE');

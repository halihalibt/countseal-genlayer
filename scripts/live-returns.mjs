import fs from 'node:fs';import crypto from 'node:crypto';
import {createClient} from 'genlayer-js';import {studionet} from 'genlayer-js/chains';import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {compactReceipt} from './compact-receipts.mjs';
import {rpc,stringify} from './network.mjs';import {executionOf} from '../src/receipt.mjs';
fs.mkdirSync('artifacts',{recursive:true});fs.mkdirSync('evidence',{recursive:true});
const file='evidence/returns-live.json',keyfile='artifacts/returns-signers.json';
const source=fs.readFileSync('contracts/count_seal.py','utf8'),digest=crypto.createHash('sha256').update(source).digest('hex');
const j=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
if(j?.completed_at){console.log('Completed returns journal.');process.exit(0);}
if(j&&(!fs.existsSync(keyfile)||j.source_sha256!==digest))throw Error('Existing journal requires its original source and signers.');
const keys=fs.existsSync(keyfile)?JSON.parse(fs.readFileSync(keyfile)):[generatePrivateKey(),generatePrivateKey(),generatePrivateKey()];
if(!fs.existsSync(keyfile))fs.writeFileSync(keyfile,JSON.stringify(keys),{mode:0o600});
const accounts=keys.map(privateKeyToAccount),actors=accounts.map(x=>x.address.toLowerCase()),clients=accounts.map(account=>createClient({chain:studionet,account}));
const journal=j??{chain_id:61999,source_sha256:digest,actors:{buyer:actors[0],supplier:actors[1],outsider:actors[2]},started_at:new Date().toISOString(),transactions:[],readbacks:{}};
const save=()=>fs.writeFileSync(file,stringify(journal));save();
function compact(r){return compactReceipt({hash:r.hash,status:r.statusName,execution:executionOf(r),from_address:r.from_address,to_address:r.to_address,data:r.data,leader_only:r.leader_only,votes:r.votes??r.consensus_data?.votes,leader_result:r.leader_result,consensus_history:r.consensus_history});}
async function tx(label,actor,method,args,expectedFailure=false){
 let e=journal.transactions.find(x=>x.label===label);
 if(!e){const hash=method==='deploy'?await clients[actor].deployContract({code:source,args:[],leaderOnly:false}):await clients[actor].writeContract({address:journal.contract,functionName:method,args,value:0n,leaderOnly:false});e={label,sender:actors[actor],method,args,expected_failure:expectedFailure,hash,submitted_at:new Date().toISOString()};journal.transactions.push(e);save();console.log('SUBMITTED',label,hash);}
 if(!e.receipt){for(let i=0;i<450;i++){
  let r;try{r=await clients[0].getTransaction({hash:e.hash});}catch(err){if(i>440)throw err;await new Promise(r=>setTimeout(r,4000));continue;}
  e.observed_status=r.statusName;save();
  if(['FINALIZED','UNDETERMINED','CANCELED'].includes(r.statusName)){e.receipt=compact(r);save();break;}
  await new Promise(r=>setTimeout(r,4000));
 }}
 if(!e.receipt||e.receipt.status!=='FINALIZED'||(e.receipt.execution==='SUCCESS')===!!e.expected_failure)throw Error('Unsuccessful acceptance '+label+' '+stringify(e.receipt));
 console.log('VERIFIED',label,e.receipt.status,e.receipt.execution);return e.receipt;
}
async function read(fn,args=[]){return JSON.parse(await clients[0].readContract({address:journal.contract,functionName:fn,args,transactionHashVariant:'latest-final'}));}
async function record(key,fn,args=[]){if(Object.hasOwn(journal.readbacks,key))return journal.readbacks[key];journal.readbacks[key]=await read(fn,args);save();return journal.readbacks[key];}
function check(ok,msg){if(!ok)throw Error(msg);}
if(Number(await rpc('eth_chainId',[]))!==61999)throw Error('Wrong chain');
if(!journal.funded){for(const a of actors)await rpc('sim_fundAccount',[a,10000]);journal.funded=true;save();}
const deployed=await tx('deploy',0,'deploy',[]);journal.contract??=deployed.data.contract_address;save();
check(await clients[0].getContractCode(journal.contract)===source,'Deployed bytes mismatch');
const items = [
 {description:'Steel hex-head bolt M8 x 30 mm, sold as one individual bolt.',quantity:12,unit_price:125},
 {description:'Steel flat washer for M8 bolts, sold as one individual washer.',quantity:20,unit_price:25},
];
const encode = JSON.stringify;
async function create(ref, title, counts) {
 const id=actors[0]+':'+ref;
 const order=()=>read('get_order',[id]);
 await tx(ref+'-create',0,'create_order',[ref,title,actors[1],'USD',encode(items)]);
 let o=await order();
 await tx(ref+'-accept',1,'accept_order',[id,o.revision,o.terms_hash]);
 o=await order();
 await tx(ref+'-receive',0,'record_receipt',[id,o.revision,'delivery-one',encode(counts)]);
 return {id,order};
}
async function propose(work, ref, counts, reason) {
 const o=await work.order();
 await tx(ref+'-propose',0,'propose_return',[work.id,o.revision,ref,encode(counts),reason]);
 return (await work.order()).returns[ref];
}
async function decide(work, ref, manifest, confirm, actor=1, failure=false, suffix='decide') {
 const o=await work.order();
 return tx(ref+'-'+suffix,actor,'decide_return',[work.id,o.revision,ref,confirm,manifest.content_hash],failure);
}
async function invoice(work, ref, quantity) {
 const id=work.id+':'+ref;
 let o=await work.order();
 await tx(ref+'-submit',1,'submit_invoice',[work.id,o.revision,ref,encode([{...items[0],quantity}])]);
 o=await work.order();
 await tx(ref+'-reconcile',1,'reconcile',[id,o.revision]);
 return record(ref,'get_invoice',[id]);
}
const primary=await create('workshop-return','Workshop fasteners · damaged shipment',[4,10]);
const manifest=await propose(primary,'damaged-bolts',[2,0],'Two bolts have damaged threads.');
await record('before-confirmation','get_order',[primary.id]);
await decide(primary,'damaged-bolts',manifest,true,2,true,'outsider');
await decide(primary,'damaged-bolts',{...manifest,content_hash:'0'.repeat(64)},true,1,true,'wrong-digest');
await decide(primary,'damaged-bolts',manifest,true);
await decide(primary,'damaged-bolts',manifest,true,1,true,'replay');
const excess=await invoice(primary,'invoice-three',3);
check(excess.state==='BLOCKED'&&excess.reasons.some(r=>r.code==='INSUFFICIENT_RECEIVED'),'Three units must be blocked');
const reserved=await invoice(primary,'invoice-two',2);
check(reserved.state==='RESERVED','Two units must reserve');
const conflict=await propose(primary,'reserved-conflict',[1,0],'Requested after the invoice reserved remaining units.');
await decide(primary,'reserved-conflict',conflict,true,1,true,'capacity');
const p=await record('workshop-final','get_order',[primary.id]);
check(p.received[0]===2&&p.returned[0]===2&&p.reserved[0]===2&&p.returns['reserved-conflict'].state==='PROPOSED','Workshop state');
const second=await create('facility-return','Facilities replenishment · declined credit',[8,12]);
const declined=await propose(second,'incorrect-damage-claim',[0,3],'Packaging claim awaiting supplier review.');
await decide(second,'incorrect-damage-claim',declined,false);
const s=await record('facilities-final','get_order',[second.id]);
check(s.received[1]===12&&s.returned[1]===0&&s.returns['incorrect-damage-claim'].state==='DECLINED','Decline isolated from quantity');
const third=await create('depot-return','Depot stock · multiple return notices',[10,16]);
for(const [ref,counts] of [['mixed-return',[2,3]],['washer-return',[0,2]]]){
 const m=await propose(third,ref,counts,'Stock condition verified by both signers.');
 await decide(third,ref,m,true);
}
await propose(third,'pending-inspection',[1,1],'Awaiting supplier inspection.');
const t=await record('depot-final','get_order',[third.id]);
check(encode(t.received)==='[8,11]'&&encode(t.returned)==='[2,5]','Cumulative returns');
fs.writeFileSync('public/deployment.json',stringify({network:'Stable Studionet',chain_id:61999,rpc:RPC,contract:journal.contract,source_sha256:digest,protocol:'countseal-2',deploy_tx:journal.transactions[0].hash,verified_order:primary.id}));
journal.completed_at=new Date().toISOString();
save();
fs.unlinkSync(keyfile);
console.log('RETURNS ACCEPTANCE COMPLETE',journal.contract);

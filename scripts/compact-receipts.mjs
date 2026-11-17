// Preserve public verification facts without duplicating validator infrastructure configuration.
import fs from 'node:fs';import {stringify} from './network.mjs';
export function compactReceipt(r){
 const summary=receipt=>({address:receipt.node_config?.address,mode:receipt.mode,vote:receipt.vote,execution:receipt.execution_result,result:receipt.result,contract_state_hash:receipt.contract_state_hash,calls:receipt.execution_stats?.call_counts,error:receipt.genvm_result?.error_description||receipt.genvm_result?.raw_error||receipt.genvm_result?.stderr?.trim().split('\n').at(-1)||undefined});
 const {consensus_history,...base}=r;const rounds=consensus_history?.consensus_results?.map(x=>({round:x.consensus_round,status_changes:x.status_changes,leader:(x.leader_result??[]).map(summary),validators:(x.validator_results??[]).map(summary)}));
 return {...base,data:{contract_address:r.data?.contract_address,calldata:r.data?.calldata},...(rounds?{consensus_rounds:rounds}:{})};
}
if(process.argv[1]?.endsWith('compact-receipts.mjs')){const path='evidence/live.json',j=JSON.parse(fs.readFileSync(path));if(!j.completed_at)throw Error('Do not rewrite a running journal.');for(const e of j.transactions)e.receipt=compactReceipt(e.receipt);fs.writeFileSync(path,stringify(j));console.log('Retained transaction identities, finality, execution, votes, calldata and validator call counts.');}

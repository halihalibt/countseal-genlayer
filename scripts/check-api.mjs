import {spawn} from 'node:child_process';import fs from 'node:fs';
const child=spawn(process.execPath,['server/index.mjs'],{env:process.env,stdio:['ignore','pipe','pipe']});let output='';
try{await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('API did not start')),10000);child.stdout.on('data',d=>{output+=d;if(output.includes('listening')){clearTimeout(timeout);resolve()}});child.on('exit',code=>reject(Error('API exited '+code)));});
 const base='http://127.0.0.1:8787';const d=JSON.parse(fs.readFileSync('public/deployment.json'));const results=[];
 for(const [path,method,status] of [['/api/health','GET',200],['/api/read','POST',405],['/api/read?method=decide_invoice','GET',400],['/api/read?method=get_protocol','GET',200],['/api/orders/'+encodeURIComponent(d.verified_order),'GET',200],['/api/orders/'+encodeURIComponent(d.verified_order)+'/approved.csv','GET',200]]){
  const r=await fetch(base+path,{method,signal:AbortSignal.timeout(120000)});const body=await r.text();if(r.status!==status)throw Error(method+' '+path+': '+r.status+' '+body);if(path.includes('/api/orders/')&&!path.endsWith('.csv')){const data=JSON.parse(body);if(data.state_variant!=='latest-final'||data.contract.toLowerCase()!==d.contract.toLowerCase())throw Error('API binding failed');}
  results.push({path,method,status:r.status,bytes:body.length});console.log(method,r.status,path);
 }
 fs.writeFileSync(d.protocol==='countseal-2'?'evidence/returns-api.json':'evidence/api.json',JSON.stringify({checked_at:new Date().toISOString(),contract:d.contract,checks:results},null,2));
}finally{child.kill();}

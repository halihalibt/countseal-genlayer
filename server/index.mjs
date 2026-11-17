import http from 'node:http';import {read,bundle,deployment} from './data.mjs';import {approvedCSV} from '../src/audit.mjs';
const allowed=new Map([['get_protocol',0],['list_orders',0],['get_order',1],['get_invoice',1]]);
const server=http.createServer(async(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type});res.end(type==='application/json'?JSON.stringify(body):body)};
 if(req.method!=='GET')return send(405,{error:'Read-only API. Sign writes in your own wallet.'});
 try{const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/health')return send(200,{service:'countseal-read-api',chain_id:61999,contract:deployment().contract,rpc_checked:false});
 if(url.pathname==='/api/read'){const method=url.searchParams.get('method'),args=JSON.parse(url.searchParams.get('args')||'[]');if(!allowed.has(method)||!Array.isArray(args)||args.length!==allowed.get(method)||args.some(x=>typeof x!=='string'||x.length>200))return send(400,{error:'Unsupported read method or arguments'});return send(200,await read(method,args));}
 const match=url.pathname.match(/^\/api\/orders\/([^/]+)(\/approved.csv)?$/);
 if(match){const id=decodeURIComponent(match[1]);if(id.length>200)return send(400,{error:'Invalid identifier'});const data=await bundle(id);if(match[2])return send(200,approvedCSV(data.result.order,data.result.invoices),'text/csv;charset=utf-8');return send(200,data);}
 return send(404,{error:'Use /api/read or /api/orders/:id'});
 }catch(e){send(503,{error:String(e.message).slice(0,240),state_variant:'latest-final',retryable:true});}
});
server.headersTimeout=10000;server.requestTimeout=120000;
server.listen(Number(process.env.COUNTSEAL_API_PORT||8787),process.env.COUNTSEAL_API_HOST||'127.0.0.1',()=>console.log('CountSeal read-only API listening'));

export type Line={description:string;quantity:number;unit_price:number};
export type Deployment={network:string;chain_id:number;rpc:string;contract:`0x${string}`;source_sha256:string;protocol:string;deploy_tx:string;verified_order?:string};
export type Order={id:string;title:string;buyer:string;supplier:string;currency:string;lines:Line[];accepted:boolean;revision:number;received:number[];returned?:number[];returns?:Record<string,ReturnRecord>;reserved:number[];approved:number[];invoice_ids:string[];receipt_refs:string[];terms_hash:string;created_at:number;events:{revision:number;action:string;subject:unknown;actor:string;at:number}[]};
export type MatchRow={status:'MATCH'|'NO_MATCH'|'AMBIGUOUS'|'UNKNOWN';target:number;invoice_quote:string;order_quote:string};
export type Invoice={id:string;order_id:string;reference:string;supplier:string;lines:Line[];terms_hash:string;content_hash:string;state:string;mapping:{rows:MatchRow[]}|null;allocation:number[];reasons:{line:number;code:string;available?:number}[];created_at:number;basis_revision?:number;basis_hash?:string};
export type TxEntry={hash:string;method:string;args:any[];sender:string;contract:string;chainId:number;intent_digest:string;at:string;status:string;execution?:string;error?:string};
export type ReturnRecord = {
  order_id: string;
  reference: string;
  quantities: number[];
  reason: string;
  content_hash: string;
  state: 'PROPOSED' | 'CONFIRMED' | 'DECLINED';
};

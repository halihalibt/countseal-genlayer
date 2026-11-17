import type {Order,Invoice} from './types';
export function canonical(value:unknown):string;
export function auditBundle(order:Order,invoices:Invoice[]):{reserved:number[];approved:number[];available:number[]};
export function approvedCSV(order:Order,invoices:Invoice[]):string;

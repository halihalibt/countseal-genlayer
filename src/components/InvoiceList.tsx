import React from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, HelpCircle, ArrowRight,
  Zap, ThumbsUp, ThumbsDown, RotateCcw, Lock, Hash, FileText,
  ArrowRightLeft
} from 'lucide-react';
import { formatMoney, humanState } from '../utils/format';
import type { Order, Invoice, MatchRow } from '../types';

function stateStyle(state: string): string {
  switch (state) {
    case 'APPROVED': return 'badge-success';
    case 'RESERVED': return 'badge-info';
    case 'SUBMITTED': return 'badge-default';
    case 'BLOCKED': case 'REVIEW_REQUIRED': return 'badge-danger';
    case 'WITHDRAWN': case 'REJECTED': return 'badge-warning';
    default: return 'badge-default';
  }
}

function matchIcon(status: string) {
  switch (status) {
    case 'MATCH': return <CheckCircle2 size={14} style={{ color: 'var(--cs-success-600)' }} />;
    case 'NO_MATCH': return <XCircle size={14} style={{ color: 'var(--cs-danger-600)' }} />;
    case 'AMBIGUOUS': return <AlertTriangle size={14} style={{ color: 'var(--cs-warning-600)' }} />;
    default: return <HelpCircle size={14} style={{ color: 'var(--cs-text-muted)' }} />;
  }
}

interface InvoiceListProps {
  invoices: Invoice[];
  order: Order;
  buyer: boolean;
  seller: boolean;
  blocked: boolean;
  onReconcile: (invId: string) => void;
  onApprove: (invId: string, contentHash: string) => void;
  onReject: (invId: string, contentHash: string) => void;
  onWithdraw: (invId: string) => void;
}

export function InvoiceList({
  invoices, order, buyer, seller, blocked,
  onReconcile, onApprove, onReject, onWithdraw,
}: InvoiceListProps) {
  const money = (v: number) => formatMoney(v, order.currency);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <ArrowRightLeft size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Invoice Reconciliation
          </h3>
          <p className="card-subtitle">
            Only FINALIZED + SUCCESS confirms execution. A successful reconciliation can still produce BLOCKED or REVIEW REQUIRED.
          </p>
        </div>
      </div>

      {invoices.length === 0 && (
        <div className="empty-state" style={{ padding: '32px 24px' }}>
          <FileText size={36} />
          <h3>No Invoices</h3>
          <p>No supplier invoices have been submitted for this order yet.</p>
        </div>
      )}

      {invoices.map(inv => (
        <InvoiceCard
          key={inv.id}
          invoice={inv}
          order={order}
          buyer={buyer}
          seller={seller}
          blocked={blocked}
          money={money}
          onReconcile={() => onReconcile(inv.id)}
          onApprove={() => onApprove(inv.id, inv.content_hash)}
          onReject={() => onReject(inv.id, inv.content_hash)}
          onWithdraw={() => onWithdraw(inv.id)}
        />
      ))}
    </div>
  );
}

interface InvoiceCardProps {
  invoice: Invoice;
  order: Order;
  buyer: boolean;
  seller: boolean;
  blocked: boolean;
  money: (v: number) => string;
  onReconcile: () => void;
  onApprove: () => void;
  onReject: () => void;
  onWithdraw: () => void;
}

function InvoiceCard({
  invoice: inv, order, buyer, seller, blocked, money,
  onReconcile, onApprove, onReject, onWithdraw,
}: InvoiceCardProps) {
  const total = inv.lines.reduce((n, l) => n + l.quantity * l.unit_price, 0);
  const isTerminal = ['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(inv.state);
  const isActive = ['RESERVED', 'APPROVED'].includes(inv.state);

  return (
    <article style={{ borderTop: '1px solid var(--cs-border)', padding: '20px 0' }}>
      {/* Invoice header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{inv.reference}</h4>
          <span className={`badge ${stateStyle(inv.state)}`}>
            {humanState(inv.state)}
          </span>
        </div>
        <span className="text-sm font-mono text-muted">
          Total: {money(total)}
        </span>
      </div>

      {/* Invoice lines with mapping */}
      <div style={{ marginTop: 16 }}>
        {inv.lines.map((l, i) => (
          <div key={i} className="mapping-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="badge badge-default" style={{ fontSize: 10 }}>Inv #{i + 1}</span>
                <span className="text-sm" style={{ fontWeight: 500 }}>
                  {l.quantity} × {money(l.unit_price)}
                </span>
              </div>
              <p className="text-sm" style={{ margin: '4px 0 0', color: 'var(--cs-text-secondary)' }}>{l.description}</p>
              {inv.mapping && (
                <p className="mapping-quote">
                  <q>{inv.mapping.rows[i].invoice_quote}</q>
                </p>
              )}
            </div>
            <div>
              {inv.mapping ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {matchIcon(inv.mapping.rows[i].status)}
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{inv.mapping.rows[i].status}</span>
                    {inv.mapping.rows[i].target >= 0 && (
                      <span className="mapping-arrow">
                        <ArrowRight size={12} />
                        PO Item #{inv.mapping.rows[i].target + 1}
                      </span>
                    )}
                  </div>
                  {inv.mapping.rows[i].order_quote && (
                    <p className="mapping-quote">
                      PO: <q>{inv.mapping.rows[i].order_quote}</q>
                    </p>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted">Awaiting reconciliation</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reasons */}
      {inv.reasons.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {inv.reasons.map((r, i) => (
            <div key={i} className="alert alert-warning" style={{ padding: '8px 12px', fontSize: 12, margin: '4px 0' }}>
              <AlertTriangle size={13} />
              <span>
                {r.code === 'INSUFFICIENT_RECEIVED' ? 'PO item' : 'Invoice line'} #{r.line + 1}: {humanState(r.code)}
                {r.available !== undefined && ` (${r.available} units available)`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Allocation */}
      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--cs-text-secondary)' }}>
        {inv.state === 'APPROVED' ? 'Approved PO units' :
         inv.state === 'RESERVED' ? 'Reserved PO units' :
         'Historical matched PO units (not active)'}: {inv.allocation.join(' / ')}
      </div>

      {/* Content & consensus binding */}
      <details className="accordion" style={{ marginTop: 12 }}>
        <summary>
          <Hash size={13} />
          Content &amp; Consensus Binding
        </summary>
        <div className="accordion-body">
          <div style={{ display: 'grid', gap: 6 }}>
            <div><span className="text-xs text-muted">Content:</span> <code style={{fontSize:11}}>{inv.content_hash}</code></div>
            <div><span className="text-xs text-muted">Terms:</span> <code style={{fontSize:11}}>{inv.terms_hash}</code></div>
            <div><span className="text-xs text-muted">Semantic input:</span> <code style={{fontSize:11}}>{inv.basis_hash || 'Not assessed'}</code></div>
            <div><span className="text-xs text-muted">Basis order revision:</span> {inv.basis_revision ?? '—'}</div>
          </div>
        </div>
      </details>

      {/* State and capacity consequences */}
      <div className="text-sm text-muted" style={{ marginTop: 12 }}>
        {inv.state === 'SUBMITTED' && 'Not yet reconciled: no PO capacity is reserved.'}
        {inv.state === 'RESERVED' && 'Reserved units reduce available capacity. Approval consumes those units; rejection or withdrawal releases them.'}
        {inv.state === 'APPROVED' && 'Approved is terminal: these units remain consumed and cannot be released.'}
        {inv.state === 'BLOCKED' && 'No units were reserved. This result cannot be manually approved; the buyer may reject or the supplier may withdraw.'}
        {inv.state === 'REVIEW_REQUIRED' && 'No units were approved. This result cannot be manually forced through; the buyer may reject or the supplier may withdraw.'}
        {inv.state === 'REJECTED' && 'Rejected is terminal: any reservation was released. Historical allocation is not active.'}
        {inv.state === 'WITHDRAWN' && 'Withdrawn is terminal: any reservation was released. Historical allocation is not active.'}
        {!buyer && !seller && !isTerminal && 'Read-only view: connect the buyer or supplier wallet to access permitted invoice actions.'}
        {buyer && inv.state === 'SUBMITTED' && 'Buyer controls: reconcile or reject. Only the supplier can withdraw.'}
        {seller && inv.state === 'SUBMITTED' && 'Supplier controls: reconcile or withdraw. Only the buyer can reject or approve.'}
        {seller && inv.state === 'RESERVED' && 'Supplier control: withdraw to release reserved units. Only the buyer can approve or reject.'}
        {buyer && inv.state === 'RESERVED' && 'Buyer controls: approve the exact invoice or reject it to release reserved units.'}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        {(buyer || seller) && inv.state === 'SUBMITTED' && (
          <button className="btn btn-primary" disabled={blocked} onClick={onReconcile}>
            <Zap size={14} />
            Reconcile with GenLayer
          </button>
        )}
        {buyer && inv.state === 'RESERVED' && (
          <button className="btn btn-success" disabled={blocked} onClick={onApprove}>
            <ThumbsUp size={14} />
            Approve Exact Invoice
          </button>
        )}
        {buyer && ['SUBMITTED', 'RESERVED', 'BLOCKED', 'REVIEW_REQUIRED'].includes(inv.state) && (
          <button className="btn btn-danger" disabled={blocked} onClick={onReject}>
            <ThumbsDown size={14} />
            Reject Invoice
          </button>
        )}
        {seller && ['SUBMITTED', 'RESERVED', 'BLOCKED', 'REVIEW_REQUIRED'].includes(inv.state) && (
          <button className="btn btn-secondary" disabled={blocked} onClick={onWithdraw}>
            <RotateCcw size={14} />
            Withdraw &amp; Release
          </button>
        )}
        {isTerminal && (
          <div className="alert alert-neutral" style={{ margin: 0, padding: '6px 12px', fontSize: 12 }}>
            <Lock size={12} />
            <span>This invoice has reached a terminal state and cannot be modified.</span>
          </div>
        )}
      </div>
    </article>
  );
}

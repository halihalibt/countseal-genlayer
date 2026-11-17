import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertCircle, Download, FileDown,
  ShieldCheck, User, Store, Eye, Clock, Hash,
  ArrowRight, Truck, Package
} from 'lucide-react';
import { formatMoney, shortenAddress, formatTimestamp } from '../utils/format';
import type { Order, Invoice, Deployment, Line } from '../types';

interface OrderDetailProps {
  order: Order;
  invoices: Invoice[];
  deployment: Deployment;
  lastRead: string;
  buyer: boolean;
  seller: boolean;
  connected: boolean;
  blocked: boolean;
  currency: string;
  onAcceptTerms: () => void;
  onRecordReceipt: (ref: string, counts: number[]) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
}

export function OrderDetail({
  order, invoices, deployment, lastRead, buyer, seller, connected, blocked, currency,
  onAcceptTerms, onRecordReceipt, onExportJSON, onExportCSV,
}: OrderDetailProps) {
  const o = order;
  const money = (v: number) => formatMoney(v, o.currency);

  return (
    <>
      {/* Order Header */}
      <div className="card">
        <div className="order-hero">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 className="order-hero-title">{o.title}</h2>
              <span className={`badge ${o.accepted ? 'badge-success' : 'badge-warning'}`}>
                {o.accepted ? (
                  <><CheckCircle2 size={12} /> Terms Accepted</>
                ) : (
                  <><Clock size={12} /> Awaiting Supplier</>
                )}
              </span>
            </div>
            <p className="font-mono text-sm text-muted" style={{ margin: '8px 0 0' }}>{o.id}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-secondary btn-sm" onClick={onExportJSON}>
              <Download size={14} /> JSON
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onExportCSV}>
              <FileDown size={14} /> CSV
            </button>
          </div>
        </div>

        <div className="order-meta">
          <div className="order-meta-item">
            <span className="order-meta-label">Buyer</span>
            <span className="order-meta-value">
              <code>{shortenAddress(o.buyer)}</code>
            </span>
          </div>
          <div className="order-meta-item">
            <span className="order-meta-label">Supplier</span>
            <span className="order-meta-value">
              <code>{shortenAddress(o.supplier)}</code>
            </span>
          </div>
          <div className="order-meta-item">
            <span className="order-meta-label">Your Role</span>
            <span className="order-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {buyer ? <><User size={13} /> Buyer</> :
               seller ? <><Store size={13} /> Supplier</> :
               connected ? <><Eye size={13} /> Observer</> :
               'Not connected'}
            </span>
          </div>
          <div className="order-meta-item">
            <span className="order-meta-label">Revision</span>
            <span className="order-meta-value">{o.revision}</span>
          </div>
          <div className="order-meta-item">
            <span className="order-meta-label">Currency</span>
            <span className="order-meta-value">{o.currency}</span>
          </div>
        </div>

        {/* High-level KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Value</div>
            <div className="kpi-value" style={{ color: 'var(--cs-teal-700)' }}>
              {money(o.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0))}
            </div>
            <div className="kpi-sub">{o.lines.length} PO lines</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Units Received</div>
            <div className="kpi-value">
              {o.received.reduce((s, v) => s + v, 0)}
              <span style={{ fontSize: 13, color: 'var(--cs-text-muted)', fontWeight: 400 }}>
                {' '}/ {o.lines.reduce((s, l) => s + l.quantity, 0)}
              </span>
            </div>
            <div className="kpi-sub">
              {o.lines.reduce((s, l) => s + l.quantity, 0) > 0
                ? `${Math.round((o.received.reduce((s, v) => s + v, 0) / o.lines.reduce((s, l) => s + l.quantity, 0)) * 100)}% of ordered`
                : '0%'}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Units Approved</div>
            <div className="kpi-value" style={{ color: 'var(--cs-success-700)' }}>
              {o.approved.reduce((s, v) => s + v, 0)}
              <span style={{ fontSize: 13, color: 'var(--cs-text-muted)', fontWeight: 400 }}>
                {' '}/ {o.received.reduce((s, v) => s + v, 0)}
              </span>
            </div>
            <div className="kpi-sub">
              {o.received.reduce((s, v) => s + v, 0) > 0
                ? `${Math.round((o.approved.reduce((s, v) => s + v, 0) / o.received.reduce((s, v) => s + v, 0)) * 100)}% of received`
                : '0%'}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Invoices</div>
            <div className="kpi-value">{invoices.length}</div>
            <div className="kpi-sub">
              {invoices.filter(i => i.state === 'APPROVED').length} approved
            </div>
          </div>
        </div>

        <details className="accordion" style={{ marginTop: 16 }}>
          <summary>
            <Hash size={14} />
            Immutable Terms Hash
          </summary>
          <div className="accordion-body">
            <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{o.terms_hash}</code>
          </div>
        </details>

        {seller && !o.accepted && (
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary btn-lg"
              disabled={blocked}
              onClick={onAcceptTerms}
            >
              <ShieldCheck size={16} />
              Accept These Exact Purchase Terms
            </button>
          </div>
        )}
      </div>

      {/* PO Lines Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Order Lines</h3>
            <p className="card-subtitle">
              For every PO line: approved + reserved ≤ received ≤ ordered.
              Buyer-declared receipts are not independently proven physical events.
            </p>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>PO Item / Unit Basis</th>
                <th className="cell-number">Ordered</th>
                <th className="cell-number">Received</th>
                <th className="cell-number">Reserved</th>
                <th className="cell-number">Approved</th>
                <th className="cell-number">Available</th>
                <th className="cell-number">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {o.lines.map((l, i) => {
                const avail = o.received[i] - o.reserved[i] - o.approved[i];
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span className="badge badge-default" style={{ flexShrink: 0, fontSize: 10 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13 }}>{l.description}</span>
                      </div>
                    </td>
                    <td className="cell-number">{l.quantity}</td>
                    <td className="cell-number">{o.received[i]}</td>
                    <td className="cell-number" style={{ color: o.reserved[i] > 0 ? 'var(--cs-warning-700)' : undefined }}>
                      {o.reserved[i]}
                    </td>
                    <td className="cell-number" style={{ color: o.approved[i] > 0 ? 'var(--cs-success-700)' : undefined }}>
                      {o.approved[i]}
                    </td>
                    <td className="cell-number" style={{ fontWeight: 600 }}>{avail}</td>
                    <td className="cell-number">{money(l.unit_price)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--cs-surface-sunken)', fontWeight: 600 }}>
                <td>Total Summary ({o.lines.length} items)</td>
                <td className="cell-number">{o.lines.reduce((s, l) => s + l.quantity, 0)}</td>
                <td className="cell-number">{o.received.reduce((s, v) => s + v, 0)}</td>
                <td className="cell-number" style={{ color: o.reserved.some(v => v > 0) ? 'var(--cs-warning-700)' : undefined }}>
                  {o.reserved.reduce((s, v) => s + v, 0)}
                </td>
                <td className="cell-number" style={{ color: o.approved.some(v => v > 0) ? 'var(--cs-success-700)' : undefined }}>
                  {o.approved.reduce((s, v) => s + v, 0)}
                </td>
                <td className="cell-number">
                  {o.lines.reduce((s, _, i) => s + (o.received[i] - o.reserved[i] - o.approved[i]), 0)}
                </td>
                <td className="cell-number" style={{ color: 'var(--cs-teal-700)' }}>
                  {money(o.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Record Receipt */}
      {buyer && o.accepted && (
        <ReceiptForm order={o} blocked={blocked} money={money} onSubmit={onRecordReceipt} />
      )}
    </>
  );
}

/* --- Receipt form --- */
interface ReceiptFormProps {
  order: Order;
  blocked: boolean;
  money: (v: number) => string;
  onSubmit: (ref: string, counts: number[]) => void;
}

function ReceiptForm({ order, blocked, money, onSubmit }: ReceiptFormProps) {
  const [receiptRef, setReceiptRef] = useState('');
  const [counts, setCounts] = useState<number[]>(() => order.lines.map(() => 0));

  useEffect(() => {
    setCounts(order.lines.map(() => 0));
  }, [order.id, order.lines.length]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Truck size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Record Received Units
          </h3>
          <p className="card-subtitle">
            Declare additional units received per PO item. Each delivery needs a unique reference.
          </p>
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={e => {
          e.preventDefault();
          onSubmit(receiptRef, counts);
        }}>
          <div className="form-group" style={{ maxWidth: 360 }}>
            <label className="form-label" htmlFor="receipt-ref">Unique Delivery Reference</label>
            <input
              id="receipt-ref"
              className="form-input"
              required
              pattern="[a-z0-9-]{3,40}"
              value={receiptRef}
              onChange={e => setReceiptRef(e.target.value)}
              placeholder="delivery-2026-q4-001"
            />
          </div>
          <div className="form-row">
            {order.lines.map((l, i) => (
              <div className="form-group" key={i}>
                <label className="form-label">Item #{i + 1} — additional received</label>
                <input
                  className="form-input"
                  required
                  type="number"
                  min={0}
                  max={l.quantity - order.received[i]}
                  step={1}
                  value={counts[i] ?? 0}
                  onChange={e => setCounts(order.lines.map((_, j) => j === i ? Number(e.target.value) : counts[j] || 0))}
                />
                <p className="form-hint">
                  Max: {l.quantity - order.received[i]} remaining
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              disabled={blocked || !counts.some(x => x > 0)}
              type="submit"
            >
              <Package size={15} />
              Sign Receipt Declaration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

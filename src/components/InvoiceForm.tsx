import React, { useState } from 'react';
import {
  FileUp, Plus, Trash2, AlertTriangle
} from 'lucide-react';
import type { Line } from '../types';
import { formatMoney } from '../utils/format';

function emptyLine(): Line {
  return { description: '', quantity: 1, unit_price: 100 };
}

interface InvoiceFormProps {
  blocked: boolean;
  currency: string;
  onSubmit: (ref: string, lines: Line[]) => void;
}

export function InvoiceForm({ blocked, currency, onSubmit }: InvoiceFormProps) {
  const [invoiceRef, setInvoiceRef] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <FileUp size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Submit an Invoice
          </h3>
          <p className="card-subtitle">
            Immutable invoice lines. To correct a mistake, withdraw this invoice and submit a new one with a unique reference.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="form-label" style={{ marginBottom: 2 }}>Total Invoice Amount</span>
          <span className="kpi-value" style={{ color: 'var(--cs-teal-700)', display: 'block' }}>
            {formatMoney(total, currency)}
          </span>
          <span className="text-xs text-muted">{lines.length} invoice {lines.length === 1 ? 'item' : 'items'}</span>
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={e => {
          e.preventDefault();
          onSubmit(invoiceRef, lines);
        }}>
          <div className="form-group" style={{ maxWidth: 360 }}>
            <label className="form-label" htmlFor="inv-ref">Unique Invoice Reference</label>
            <input
              id="inv-ref"
              className="form-input"
              required
              pattern="[a-z0-9-]{3,40}"
              value={invoiceRef}
              onChange={e => setInvoiceRef(e.target.value)}
              placeholder="inv-2026-001"
            />
          </div>

          <p className="form-hint mb-8">
            Use exact physical specifications and unit/pack basis. Unit price is an integer in minor units (125 = 1.25).
          </p>

          {lines.map((l, i) => (
            <div className="line-editor-row" key={i}>
              <div>
                <div className="line-editor-index">Invoice Item {i + 1}</div>
                <textarea
                  className="form-textarea"
                  required
                  minLength={5}
                  maxLength={700}
                  placeholder="Describe the delivered item exactly as invoiced"
                  value={l.description}
                  onChange={e => setLines(lines.map((x, j) => i === j ? { ...x, description: e.target.value } : x))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  className="form-input"
                  required
                  type="number"
                  min={1}
                  max={1000000}
                  step={1}
                  value={l.quantity}
                  onChange={e => setLines(lines.map((x, j) => i === j ? { ...x, quantity: Number(e.target.value) } : x))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Price (minor)</label>
                <input
                  className="form-input"
                  required
                  type="number"
                  min={1}
                  max={100000000}
                  step={1}
                  value={l.unit_price}
                  onChange={e => setLines(lines.map((x, j) => i === j ? { ...x, unit_price: Number(e.target.value) } : x))}
                />
              </div>
              <div style={{ paddingBottom: 4 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  aria-label={`Remove invoice item ${i + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={lines.length >= 8}
            onClick={() => setLines([...lines, emptyLine()])}
            style={{ marginTop: 8 }}
          >
            <Plus size={14} />
            Add Item
          </button>

          <div className="card-footer" style={{ justifyContent: 'space-between' }}>
            <div className="alert alert-neutral" style={{ margin: 0, flex: 1, maxWidth: 400 }}>
              <AlertTriangle size={14} />
              <span>Invoice content is immutable. Corrections require withdrawal &amp; resubmission.</span>
            </div>
            <button className="btn btn-primary btn-lg" disabled={blocked} type="submit">
              <FileUp size={15} />
              Sign &amp; Submit Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Plus, Trash2, Send, AlertTriangle, CheckSquare, Shield } from 'lucide-react';
import type { Line } from '../types';

function emptyLine(): Line {
  return { description: '', quantity: 1, unit_price: 100 };
}

interface LineEditorProps {
  value: Line[];
  onChange: (lines: Line[]) => void;
}

export function LineEditor({ value, onChange }: LineEditorProps) {
  return (
    <div>
      <p className="form-hint mb-8">
        Use exact physical specifications and unit/pack basis. Unit price is an integer in minor units (125 = 1.25).
      </p>
      {value.map((l, i) => (
        <div className="line-editor-row" key={i}>
          <div>
            <div className="line-editor-index">Item {i + 1}</div>
            <textarea
              className="form-textarea"
              required
              minLength={5}
              maxLength={700}
              placeholder="e.g. 304 Stainless Steel Hex Bolt M12×60mm — per 100-piece box"
              value={l.description}
              onChange={e => onChange(value.map((x, j) => i === j ? { ...x, description: e.target.value } : x))}
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
              onChange={e => onChange(value.map((x, j) => i === j ? { ...x, quantity: Number(e.target.value) } : x))}
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
              onChange={e => onChange(value.map((x, j) => i === j ? { ...x, unit_price: Number(e.target.value) } : x))}
            />
          </div>
          <div style={{ paddingBottom: 4 }}>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              disabled={value.length === 1}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={`Remove item ${i + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={value.length >= 8}
        onClick={() => onChange([...value, emptyLine()])}
        style={{ marginTop: 8 }}
      >
        <Plus size={14} />
        Add Item
      </button>
    </div>
  );
}

interface NewOrderFormProps {
  blocked: boolean;
  onSubmit: (ref: string, title: string, supplier: string, currency: string, items: Line[]) => void;
}

export function NewOrderForm({ blocked, onSubmit }: NewOrderFormProps) {
  const [ref, setRef] = useState('');
  const [title, setTitle] = useState('');
  const [supplier, setSupplier] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [items, setItems] = useState<Line[]>([emptyLine()]);
  const [confirmed, setConfirmed] = useState(false);

  const totalValue = items.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price || 0), 0);
  const totalUnits = items.reduce((s, l) => s + (l.quantity || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(ref, title, supplier, currency, items);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Create Immutable Purchase Terms</h2>
          <p className="card-subtitle">
            The supplier must separately accept the exact terms hash before you can record receipts.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="form-label" style={{ marginBottom: 2 }}>Calculated Order Total</span>
          <span className="kpi-value" style={{ color: 'var(--cs-teal-700)', display: 'block' }}>
            {new Intl.NumberFormat('en', { style: 'currency', currency }).format(totalValue / 100)}
          </span>
          <span className="text-xs text-muted">
            {items.length} {items.length === 1 ? 'item' : 'items'} · {totalUnits} total units
          </span>
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="po-ref">Reference</label>
              <input
                id="po-ref"
                className="form-input"
                required
                pattern="[a-z0-9-]{3,40}"
                value={ref}
                onChange={e => setRef(e.target.value)}
                placeholder="workshop-order-001"
              />
              <p className="form-hint">3–40 chars, lowercase letters, digits and hyphens</p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="po-title">Title</label>
              <input
                id="po-title"
                className="form-input"
                required
                minLength={3}
                maxLength={100}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Workshop fasteners — Q4 2026"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="po-supplier">Supplier Wallet Address</label>
              <input
                id="po-supplier"
                className="form-input font-mono"
                required
                pattern="0x[0-9a-fA-F]{40}"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="0x…"
              />
              <p className="form-hint">Must be a valid 40-character hex Ethereum-compatible address</p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="po-currency">Currency</label>
              <select
                id="po-currency"
                className="form-select"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                {['USD', 'EUR', 'GBP', 'SGD'].map(c => <option key={c}>{c}</option>)}
              </select>
              <p className="form-hint">Prices in minor units (e.g. 100 = 1.00 USD)</p>
            </div>
          </div>

          <LineEditor value={items} onChange={setItems} />

          {/* Pre-signing confirmation summary */}
          <div className="card" style={{ marginTop: 24, background: 'var(--cs-surface-sunken)', borderColor: 'var(--cs-border-strong)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={16} style={{ color: 'var(--cs-teal-700)' }} />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Pre-Signing Summary</h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 13 }}>
              <div>
                <span className="text-muted" style={{ fontSize: 11, display: 'block' }}>Reference:</span>
                <code>{ref || '—'}</code>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: 11, display: 'block' }}>Supplier:</span>
                <code>{supplier ? `${supplier.slice(0, 10)}…${supplier.slice(-8)}` : '—'}</code>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: 11, display: 'block' }}>Items &amp; Units:</span>
                <span>{items.length} items / {totalUnits} units</span>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: 11, display: 'block' }}>Order Total:</span>
                <span style={{ fontWeight: 600, color: 'var(--cs-teal-700)' }}>
                  {new Intl.NumberFormat('en', { style: 'currency', currency }).format(totalValue / 100)}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span>I have reviewed the terms and understand they cannot be modified once signed.</span>
              </label>
            </div>
          </div>

          <div className="card-footer" style={{ justifyContent: 'space-between' }}>
            <div className="alert alert-neutral" style={{ margin: 0, flex: 1, maxWidth: 440 }}>
              <AlertTriangle size={14} />
              <span>Terms are permanently immutable upon transaction finalization.</span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              disabled={blocked || !confirmed || !ref || !title || !supplier || items.length === 0}
              type="submit"
            >
              <Send size={15} />
              Sign &amp; Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import {useState} from 'react';
import {ArrowDownLeft, ArrowUpRight, Boxes, RotateCcw} from 'lucide-react';
import type {Order, ReturnRecord} from '../types';

export function CapacityBoard({order}: {order: Order}) {
  const [selected, setSelected] = useState(0);
  const available = order.received[selected] - order.reserved[selected] - order.approved[selected];
  const returned = order.returned?.[selected] ?? 0;
  const bins = [
    {label: 'Available', value: available, color: '#d8ff64'},
    {label: 'Reserved', value: order.reserved[selected], color: '#b2a2ff'},
    {label: 'Approved', value: order.approved[selected], color: '#f0e9d8'},
    {label: 'Returned', value: returned, color: '#ffa889'},
  ];
  return <section className="capacity-board" aria-label="Inventory capacity">
    <header><span><Boxes size={17}/> Inventory capacity</span><span>REV {order.revision}</span></header>
    <h2>{available.toLocaleString()} <small>available to invoice</small></h2>
    <div className="cargo-scene" aria-hidden="true">
      {bins.map(bin => <div key={bin.label} className="cargo-slot" style={{'--cargo-color': bin.color} as React.CSSProperties}>
        {Array.from({length: bin.value === 0 ? 0 : Math.min(5, Math.ceil(bin.value / Math.max(1, Math.ceil(order.lines[selected].quantity / 5))))}, (_, i) =>
          <i key={i} style={{'--layer': i} as React.CSSProperties} />)}
      </div>)}
    </div>
    <div className="cargo-key">{bins.map(bin => <div key={bin.label}><span>{bin.label}</span><strong style={{color: bin.color}}>{bin.value.toLocaleString()}</strong></div>)}</div>
    <label className="cargo-line">Inspect order line<select value={selected} onChange={e => setSelected(Number(e.target.value))}>
      {order.lines.map((line, i) => <option key={i} value={i}>{line.description}</option>)}
    </select></label>
  </section>;
}

interface Props {
  order: Order;
  buyer: boolean;
  seller: boolean;
  blocked: boolean;
  onPropose: (ref: string, counts: number[], reason: string) => void;
  onDecide: (record: ReturnRecord, confirm: boolean) => void;
}
export function Returns({order, buyer, seller, blocked, onPropose, onDecide}: Props) {
  const [ref, setRef] = useState('');
  const [reason, setReason] = useState('');
  const [counts, setCounts] = useState(() => order.lines.map(() => 0));
  const records = Object.values(order.returns ?? {});
  return <section className="return-manifest">
    <header><RotateCcw size={17}/> Return manifest <span>{records.length}</span></header>
    <h2>Return approvals</h2>
    <p>Buyers record the goods and reason. A supplier confirms the signed manifest before available stock changes.</p>
    {records.length === 0 && <p className="manifest-empty">No returns recorded for this order.</p>}
    {records.map(record => {
      const capacity = record.quantities.every((value, i) => value <= order.received[i] - order.reserved[i] - order.approved[i]);
      return <details key={record.reference}>
        <summary><span>{record.reference}<small>{record.quantities.reduce((sum, value) => sum + value, 0)} units</small></span><strong>{record.state}</strong></summary>
        <p>{record.reason}</p>
        <ul>{record.quantities.map((value, i) => value > 0 && <li key={i}>{value} × {order.lines[i].description}</li>)}</ul>
        <code>{record.content_hash}</code>
        {record.state === 'PROPOSED' && !capacity && <p>Current invoice allocations leave insufficient capacity for confirmation.</p>}
        {seller && record.state === 'PROPOSED' && <div className="manifest-actions">
          <button className="btn btn-primary btn-sm" disabled={blocked || !capacity} onClick={() => onDecide(record, true)}><ArrowDownLeft size={14}/> Confirm</button>
          <button className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => onDecide(record, false)}>Decline</button>
        </div>}
      </details>;
    })}
    {buyer && order.accepted && <details>
      <summary>Propose a return <ArrowUpRight size={15}/></summary>
      <form onSubmit={e => {e.preventDefault(); onPropose(ref, counts, reason);}}>
        <label>Reference<input className="form-input" required pattern="[a-z0-9-]{3,40}" value={ref} onChange={e => setRef(e.target.value)}/></label>
        <label>Reason<input className="form-input" required minLength={3} maxLength={160} value={reason} onChange={e => setReason(e.target.value)}/></label>
        {order.lines.map((line, i) => <label key={i}>{line.description}<input className="form-input" type="number" required min={0} max={order.received[i]} step={1} value={counts[i]} onChange={e => setCounts(counts.map((v, j) => i === j ? Number(e.target.value) : v))}/></label>)}
        <button className="btn btn-primary" disabled={blocked || counts.every(v => v === 0)}>Sign manifest</button>
      </form>
    </details>}
  </section>;
}

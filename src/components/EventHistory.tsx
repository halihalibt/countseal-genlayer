import React from 'react';
import { Clock, History } from 'lucide-react';
import { formatTimestamp } from '../utils/format';
import { shortenAddress } from '../utils/format';
import type { Order } from '../types';

interface EventHistoryProps {
  order: Order;
}

export function EventHistory({ order }: EventHistoryProps) {
  return (
    <div className="card">
      <details className="accordion" open>
        <summary>
          <History size={14} />
          Signed Event History — {order.events.length} events · Revision {order.revision}
        </summary>
        <div className="accordion-body">
          {[...order.events].reverse().map(e => (
            <div key={e.revision} style={{ borderTop: '1px solid var(--cs-border)', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="badge badge-default" style={{ fontSize: 10 }}>#{e.revision}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{e.action}</span>
              </div>
              <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={12} />
                {formatTimestamp(e.at)}
                <span>·</span>
                <code style={{ fontSize: 11 }}>{shortenAddress(e.actor)}</code>
              </div>
              <pre className="code-block" style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(e.subject, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

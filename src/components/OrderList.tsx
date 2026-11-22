import React, { useState } from 'react';
import {
  FileText, Clock, ChevronRight, Package, Inbox, Search
} from 'lucide-react';
import { formatISODate } from '../utils/format';

interface OrderListProps {
  ids: string[];
  selected: string;
  lastRead: string;
  issue: string;
  reading: boolean;
  onSelect: (id: string) => void;
}

export function OrderList({ ids, selected, lastRead, issue, reading, onSelect }: OrderListProps) {
  const [filter, setFilter] = useState('');

  const filteredIds = filter.trim()
    ? ids.filter(id => id.toLowerCase().includes(filter.toLowerCase()))
    : ids;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Purchase Orders</h2>
          <p className="card-subtitle">
            {lastRead
              ? <>Last coherent finalized read: {formatISODate(lastRead)}</>
              : reading
                ? 'Reading finalized chain data…'
                : 'Waiting for chain data…'
            }
          </p>
        </div>
        {ids.length > 0 && (
          <div className="order-switch-select">
            <select
              className="form-select"
              aria-label="Select purchase order"
              value={selected}
              onChange={e => e.target.value && onSelect(e.target.value)}
              style={{ margin: 0, fontSize: 13 }}
            >
              <option value="">Select an order ({ids.length})</option>
              {ids.map(id => (
                <option key={id} value={id}>
                  {id.split(':').at(-1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="card-body">
        {reading && ids.length === 0 && (
          <div>
            {[1, 2, 3].map(i => (
              <div className="skeleton-row" key={i}>
                <div className="skeleton skeleton-cell" />
              </div>
            ))}
          </div>
        )}

        {!reading && ids.length === 0 && lastRead && !issue && (
          <div className="empty-state">
            <Inbox size={48} />
            <h3>No Orders Yet</h3>
            <p>Create the first purchase order to start tracking procurement and invoices.</p>
          </div>
        )}

        {ids.length > 5 && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--cs-text-placeholder)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Filter orders by ID…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ paddingLeft: 32, margin: 0, fontSize: 13 }}
            />
          </div>
        )}

        {filteredIds.length > 0 && (
          <div className="order-switch-list">
            {filteredIds.map(id => {
              const isSelected = selected === id;
              return (
                <button
                  key={id.split(':').at(-1)}
                  className="wallet-option"
                  onClick={() => onSelect(id)}
                  style={isSelected ? { borderColor: 'var(--cs-teal-500)', background: 'var(--cs-teal-50)' } : {}}
                  title={id}
                  aria-pressed={isSelected}
                >
                  <div
                    className="wallet-icon"
                    style={{ background: isSelected ? 'var(--cs-teal-100)' : undefined }}
                  >
                    <FileText size={16} />
                  </div>
                  <span
                    className="font-mono"
                    style={{
                      flex: 1,
                      fontSize: 13,
                      overflow: 'hidden',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {id.split(':').at(-1)}
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--cs-text-muted)' }} />
                </button>
              );
            })}
          </div>
        )}

        {ids.length > 0 && filteredIds.length === 0 && (
          <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px 0' }}>
            No orders match "{filter}".
          </p>
        )}
      </div>
    </div>
  );
}

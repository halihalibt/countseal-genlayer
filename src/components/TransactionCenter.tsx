import React from 'react';
import {
  ArrowLeftRight, ExternalLink, CheckCircle2, XCircle,
  Clock, AlertCircle, RotateCw, FileText, ChevronRight
} from 'lucide-react';
import { explorer } from '../chain';
import { formatISODate } from '../utils/format';
import type { TxEntry } from '../types';

function statusBadge(t: TxEntry): { className: string; icon: React.ReactNode } {
  if (t.status === 'FINALIZED' && t.execution === 'SUCCESS') {
    return { className: 'badge-success', icon: <CheckCircle2 size={12} /> };
  }
  if (t.status === 'FINALIZED') {
    return { className: 'badge-danger', icon: <XCircle size={12} /> };
  }
  if (t.status === 'SUBMITTED' || t.status === 'PROPOSING' || t.status === 'COMMITTING') {
    return { className: 'badge-warning', icon: <Clock size={12} /> };
  }
  return { className: 'badge-default', icon: <AlertCircle size={12} /> };
}

interface TransactionCenterProps {
  txs: TxEntry[];
  onViewOrder: () => void;
}

export function TransactionCenter({ txs, onViewOrder }: TransactionCenterProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <ArrowLeftRight size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Transaction Center
          </h2>
          <p className="card-subtitle">
            Only FINALIZED + SUCCESS confirms execution. A successful reconciliation can still produce BLOCKED or REVIEW REQUIRED. Inspect its finalized invoice state.
          </p>
        </div>
      </div>

      {txs.length === 0 && (
        <div className="empty-state" style={{ padding: '32px 24px' }}>
          <ArrowLeftRight size={36} />
          <h3>No Transactions</h3>
          <p>No transactions have been submitted from this tab session.</p>
        </div>
      )}

      {txs.map(t => {
        const badge = statusBadge(t);
        return (
          <article key={t.hash} style={{ borderTop: '1px solid var(--cs-border)', padding: '20px 0' }}>
            <div className="tx-card">
              <div>
                <p className="tx-method">{t.method}</p>
                <div className="tx-status-row">
                  <span className={`badge ${badge.className}`}>
                    {badge.icon} {t.status}
                  </span>
                  {t.execution && (
                    <span className={`badge ${t.execution === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                      {t.execution}
                    </span>
                  )}
                </div>
                <a
                  href={`${explorer}/tx/${t.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tx-hash"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {t.hash}
                  <ExternalLink size={12} />
                </a>
                <div className="text-sm text-muted" style={{ marginTop: 6 }}>
                  Signer: <code style={{fontSize:11}}>{t.sender}</code>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Stable Studionet · Chain {t.chainId}
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Contract: <code style={{fontSize:11}}>{t.contract}</code>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Intent SHA-256: <code style={{fontSize:11}}>{t.intent_digest}</code>
                </div>
                {t.at && (
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {formatISODate(t.at)}
                  </div>
                )}
              </div>
              <div>
                {t.status === 'FINALIZED' && t.execution === 'SUCCESS' && (
                  <button className="btn btn-primary btn-sm" onClick={onViewOrder}>
                    <RotateCw size={13} />
                    Read Updated State
                  </button>
                )}
              </div>
            </div>

            {t.error && (
              <div className="alert alert-warning" style={{ marginTop: 12 }}>
                <AlertCircle size={14} />
                <div>
                  <strong>Monitoring status:</strong> {t.error}<br />
                  The hash remains recorded; monitoring will retry.
                </div>
              </div>
            )}

            {t.status === 'FINALIZED' && t.execution !== 'SUCCESS' && (
              <div className="alert alert-error" style={{ marginTop: 12 }}>
                <XCircle size={14} />
                <span>Execution failed. No successful business action is claimed.</span>
              </div>
            )}

            <details className="accordion" style={{ marginTop: 12 }}>
              <summary>
                <FileText size={13} />
                Signed Intent
              </summary>
              <div className="accordion-body">
                <pre className="code-block" style={{ maxHeight: 200, overflow: 'auto' }}>
                  {JSON.stringify(t.args, null, 2)}
                </pre>
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}

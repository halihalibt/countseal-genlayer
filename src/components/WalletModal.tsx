import React, { useEffect, useRef } from 'react';
import { X, Wallet, Key, Zap, ChevronRight } from 'lucide-react';
import { shortenAddress } from '../utils/format';
import type { Wallet as WalletType, Connection } from '../chain';

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  wallets: WalletType[];
  connections: Connection[];
  currentConnection: Connection | undefined;
  busy: boolean;
  onConnect: (w: WalletType) => void;
  onSession: () => void;
  onSelect: (c: Connection) => void;
  onDisconnect: () => void;
}

export function WalletModal({
  open, onClose, wallets, connections, currentConnection, busy,
  onConnect, onSession, onSelect, onDisconnect,
}: WalletModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(selector) ?? [])
      .filter(el => el.offsetParent !== null);
    focusable()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = focusable();
      if (!nodes.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="wallet-dialog-title" tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="wallet-dialog-title" className="modal-title">Connect Wallet</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Detected wallets */}
          <div className="mb-16">
            <p className="form-label mb-8" style={{fontSize:12}}>Detected Wallets</p>
            {wallets.length > 0 ? (
              <div className="wallet-list">
                {wallets.map(w => (
                  <button
                    key={w.id}
                    className="wallet-option"
                    disabled={busy}
                    onClick={() => onConnect(w)}
                  >
                    <div className="wallet-icon">
                      <Wallet size={18} />
                    </div>
                    <span style={{flex:1}}>{w.name}</span>
                    <ChevronRight size={16} style={{color:'var(--cs-text-muted)'}} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="alert alert-neutral">
                No injected wallet provider detected. Enable a compatible EIP-1193 / EIP-6963 wallet extension and refresh.
              </div>
            )}
            <p className="form-hint" style={{marginTop:12}}>
              Supports EIP-6963 multi-wallet discovery with EIP-1193 legacy fallback. 
              Compatible with MetaMask, OKX Wallet, Rabby, Coinbase, Trust and others.
            </p>
          </div>

          {/* Temporary signers */}
          <details className="accordion">
            <summary>
              <Key size={14} />
              Temporary Studionet Signers
            </summary>
            <div className="accordion-body">
              <p className="text-sm text-muted mb-8">
                Disposable real keys stay in this tab's memory only. Reloading loses their control. 
                Use two signers to try buyer and supplier roles. Never deposit real assets.
              </p>
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={onSession}
              >
                <Zap size={14} />
                Create Temporary Signer
              </button>
            </div>
          </details>

          {/* Connected accounts */}
          {connections.length > 0 && (
            <div style={{marginTop: 16}}>
              <p className="form-label mb-8" style={{fontSize:12}}>Active Signers</p>
              <div className="wallet-list">
                {connections.map((c, i) => (
                  <button
                    key={c.address}
                    className="wallet-option"
                    onClick={() => onSelect(c)}
                    style={currentConnection?.address === c.address ? {borderColor:'var(--cs-teal-500)', background:'var(--cs-teal-50)'} : {}}
                  >
                    <div className="wallet-icon">
                      <Key size={16} />
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500, fontSize:13}}>Signer {i + 1}</div>
                      <div className="mono" style={{fontSize:11, color:'var(--cs-text-muted)'}}>
                        {shortenAddress(c.address)}
                      </div>
                    </div>
                    {currentConnection?.address === c.address && (
                      <span className="badge badge-teal">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {currentConnection && (
            <button className="btn btn-danger btn-sm" onClick={onDisconnect}>
              Disconnect
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

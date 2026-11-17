import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  connect, discover, session, read, verify, submit, poll, download,
  explainError, type Wallet, type Connection,
} from './chain';
import { hash } from './chain';
import { auditBundle, canonical, approvedCSV } from './audit.mjs';
import type { Deployment, Order, Invoice, Line, TxEntry } from './types';
import { Header } from './components/Header';
import { Navigation, type TabId } from './components/Navigation';
import { WalletModal } from './components/WalletModal';
import { OrderList } from './components/OrderList';
import { OrderDetail } from './components/OrderDetail';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoiceList } from './components/InvoiceList';
import { NewOrderForm } from './components/NewOrderForm';
import { EventHistory } from './components/EventHistory';
import { TransactionCenter } from './components/TransactionCenter';
import { Footer } from './components/Footer';
import { AlertTriangle, AlertCircle, Loader, X, Info } from 'lucide-react';
import './style.css';

const pending = (t: TxEntry) => !['FINALIZED', 'UNDETERMINED', 'CANCELED'].includes(t.status);

function App() {
  /* ---- Deployment & source ---- */
  const [d, setD] = useState<Deployment>();
  const [source, setSource] = useState(false);

  /* ---- Wallet ---- */
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [c, setC] = useState<Connection>();
  const [walletOpen, setWalletOpen] = useState(false);

  /* ---- Data ---- */
  const [ids, setIds] = useState<string[]>([]);
  const [selected, setSelected] = useState(
    new URLSearchParams(location.search).get('order') || ''
  );
  const [o, setO] = useState<Order>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  /* ---- State ---- */
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [issue, setIssue] = useState('');
  const [error, setError] = useState('');
  const [lastRead, setLastRead] = useState('');

  /* ---- UI ---- */
  const [tab, setTab] = useState<TabId>('orders');

  /* ---- Transactions ---- */
  const [txs, setTxs] = useState<TxEntry[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('countseal-transactions') || '[]'); }
    catch { return []; }
  });
  const txRef = useRef(txs);
  txRef.current = txs;

  /* ---- Derived ---- */
  const blocked = busy || txs.some(pending) || !c || !source || !!issue || reading;
  const buyer = !!o && c?.address === o.buyer;
  const seller = !!o && c?.address === o.supplier;
  const mounted = useRef(true);

  /* ======== DATA LOADING ======== */
  async function load(config = d, chosen = selected) {
    if (!config) return;
    setReading(true);
    try {
      await verify(config);
      setSource(true);
      const list = await read<string[]>(config, 'list_orders');
      if (!Array.isArray(list) || list.some(x => typeof x !== 'string'))
        throw Error('Invalid order index response');
      setIds(list);

      const pick = chosen || (list.includes(config.verified_order || '') ? config.verified_order : list[0]);
      if (pick) {
        const order = await read<Order>(config, 'get_order', [pick]);
        const inv: Invoice[] = [];
        for (const id of order.invoice_ids)
          inv.push(await read<Invoice>(config, 'get_invoice', [id]));
        const second = await read<Order>(config, 'get_order', [pick]);
        if (second.revision !== order.revision)
          throw Error('Order changed during read. Refresh to obtain a coherent snapshot.');
        auditBundle(order, inv);
        if (await hash(canonical({
          id: order.id, buyer: order.buyer, supplier: order.supplier,
          currency: order.currency, lines: order.lines
        })) !== order.terms_hash)
          throw Error('Terms hash mismatch');
        for (const x of inv)
          if (await hash(canonical(x.lines)) !== x.content_hash)
            throw Error('Invoice content hash mismatch');
        setO(order);
        setInvoices(inv);
        setSelected(pick);
      } else {
        setO(undefined);
        setInvoices([]);
      }
      setIssue('');
      setLastRead(new Date().toISOString());
    } catch (e) {
      setIssue(explainError(e));
    } finally {
      setReading(false);
    }
  }

  /* ======== EFFECTS ======== */
  useEffect(() => {
    mounted.current = true;
    const stop = discover(w =>
      setWallets(old => old.some(x => x.provider === w.provider) ? old : [...old, w])
    );
    fetch(import.meta.env.BASE_URL + 'deployment.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw Error('Deployment metadata could not be loaded.'); return r.json(); })
      .then(config => { setD(config); void load(config); })
      .catch(e => setIssue(explainError(e)));
    return () => { mounted.current = false; stop(); };
  }, []);

  useEffect(() => {
    if (!d) return;
    const id = setInterval(() => void load(), 30000);
    return () => clearInterval(id);
  }, [d, selected]);

  useEffect(() => {
    if (!c?.provider?.on) return;
    const provider = c.provider;
    const changed = () => {
      setC(undefined);
      setError('Wallet account or network changed. Reconnect to review the current signer.');
    };
    provider.on?.('accountsChanged', changed);
    provider.on?.('chainChanged', changed);
    return () => {
      provider.removeListener?.('accountsChanged', changed);
      provider.removeListener?.('chainChanged', changed);
    };
  }, [c]);

  useEffect(() => {
    sessionStorage.setItem('countseal-transactions', JSON.stringify(txs));
  }, [txs]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      for (const t of txRef.current.filter(pending)) {
        try {
          const updated = await poll(t);
          if (stopped) return;
          setTxs(old => old.map(x => x.hash === t.hash ? updated : x));
          if (updated.status === 'FINALIZED' && updated.execution === 'SUCCESS')
            await load();
        } catch (e) {
          if (!stopped)
            setTxs(old => old.map(x => x.hash === t.hash ? { ...x, error: explainError(e) } : x));
        }
      }
      if (!stopped) timer = setTimeout(tick, 5000);
    }
    void tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [d, selected]);

  /* ======== ACTIONS ======== */
  async function action(method: string, args: any[]) {
    if (!d || !c || blocked) return;
    setError('');
    setBusy(true);
    try {
      const t = await submit(d, c, method, args);
      setTxs(old => [t, ...old]);
      setTab('transactions');
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }

  async function addWallet(w?: Wallet) {
    setBusy(true);
    setError('');
    try {
      const x = w ? await connect(w) : await session();
      setConnections(old => [...old.filter(y => y.address !== x.address), x]);
      setC(x);
      setWalletOpen(false);
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }

  function choose(id: string) {
    setO(undefined);
    setInvoices([]);
    setSelected(id);
    const url = new URL(location.href);
    url.searchParams.set('order', id);
    history.replaceState(null, '', url);
    void load(d, id);
    setTab('orders');
  }

  /* ======== RENDER ======== */
  return (
    <div className="app-layout">
      <Header
        sourceVerified={source}
        connection={c}
        onWalletClick={() => setWalletOpen(!walletOpen)}
      />

      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        wallets={wallets}
        connections={connections}
        currentConnection={c}
        busy={busy}
        onConnect={w => void addWallet(w)}
        onSession={() => void addWallet()}
        onSelect={x => { setC(x); setWalletOpen(false); }}
        onDisconnect={() => { setC(undefined); setWalletOpen(false); }}
      />

      <div className="app-body">
        {/* Page intro */}
        <div className="page-intro">
          <h1>Procurement Reconciliation Workspace</h1>
          <p>
            Reconcile supplier descriptions against immutable purchase terms.
            Reserve only received units. Confirm with a buyer signature.
          </p>
          <div className="testnet-notice">
            <AlertTriangle size={14} />
            <span>
              Public testnet records only. Do not enter personal, confidential or commercial invoice data.
              Approval records reconciliation; it does not pay an invoice or prove a physical delivery.
            </span>
          </div>
        </div>

        <Navigation
          active={tab}
          txCount={txs.length}
          reading={reading}
          onTabChange={setTab}
          onRefresh={() => void load()}
        />

        {/* System alerts */}
        {issue && (
          <div className="alert alert-warning" role="status">
            <AlertCircle size={16} />
            <div style={{ flex: 1 }}>
              <strong>Connection / Read Status</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                {issue} Visible records may be from the last read. Writes pause until a successful refresh.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={16} />
            <span style={{ flex: 1 }}>{error}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setError('')}>
              <X size={14} />
            </button>
          </div>
        )}

        {busy && (
          <div className="alert alert-info" role="status">
            <Loader size={16} className="spinner" />
            <span>Waiting for the wallet request…</span>
          </div>
        )}

        {txs.some(pending) && (
          <div className="alert alert-neutral" role="status">
            <Info size={16} />
            <span>
              A transaction is pending. Monitoring continues here and resumes after reload. Do not resubmit it.
            </span>
          </div>
        )}

        {/* TAB: Purchase orders */}
        {tab === 'orders' && (
          <>
            <OrderList
              ids={ids}
              selected={selected}
              lastRead={lastRead}
              issue={issue}
              reading={reading}
              onSelect={choose}
            />

            {o && (
              <>
                <OrderDetail
                  order={o}
                  invoices={invoices}
                  deployment={d!}
                  lastRead={lastRead}
                  buyer={buyer}
                  seller={seller}
                  connected={!!c}
                  blocked={blocked}
                  currency={o.currency}
                  onAcceptTerms={() => void action('accept_order', [o.id, o.revision, o.terms_hash])}
                  onRecordReceipt={(ref, counts) => void action('record_receipt', [o.id, o.revision, ref, JSON.stringify(counts)])}
                  onExportJSON={() => download('countseal-finalized-record.json', {
                    deployment: d, read_at: lastRead, state_variant: 'latest-final',
                    order: o, invoices,
                  })}
                  onExportCSV={() => {
                    const blob = new Blob([approvedCSV(o, invoices)], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'countseal-approved-lines.csv';
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 500);
                  }}
                />

                {/* Invoice submission (supplier only) */}
                {seller && o.accepted && (
                  <InvoiceForm
                    blocked={blocked}
                    currency={o.currency}
                    onSubmit={(ref, lines) => void action('submit_invoice', [o.id, o.revision, ref, JSON.stringify(lines)])}
                  />
                )}

                {/* Invoice reconciliation */}
                <InvoiceList
                  invoices={invoices}
                  order={o}
                  buyer={buyer}
                  seller={seller}
                  blocked={blocked}
                  onReconcile={invId => void action('reconcile', [invId, o.revision])}
                  onApprove={(invId, contentHash) => void action('decide_invoice', [invId, o.revision, true, contentHash])}
                  onReject={(invId, contentHash) => void action('decide_invoice', [invId, o.revision, false, contentHash])}
                  onWithdraw={invId => void action('withdraw_invoice', [invId, o.revision])}
                />

                {/* Event history */}
                <EventHistory order={o} />
              </>
            )}
          </>
        )}

        {/* TAB: New order */}
        {tab === 'new' && (
          <NewOrderForm
            blocked={blocked}
            onSubmit={(ref, title, supplier, currency, items) =>
              void action('create_order', [ref, title, supplier, currency, JSON.stringify(items)])
            }
          />
        )}

        {/* TAB: Transactions */}
        {tab === 'transactions' && (
          <TransactionCenter
            txs={txs}
            onViewOrder={() => { setTab('orders'); void load(); }}
          />
        )}
      </div>

      <Footer deployment={d} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

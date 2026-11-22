"""Mock-host tests; not network consensus or GenVM execution evidence."""
import unittest, types, sys, importlib.util, json, copy, itertools
class Collection:
    def __class_getitem__(cls, _): return cls
class Return:
    def __init__(self, value): self.calldata=value
class Decorator:
    def __getattr__(self, _): return lambda fn:fn
A=['0x'+str(i)*40 for i in range(1,4)]
gl=types.SimpleNamespace(Contract=object,public=Decorator(),message=types.SimpleNamespace(sender_address=A[0]),message_raw={'datetime':'2026-11-17T00:00:00+00:00'},vm=types.SimpleNamespace(Return=Return),nondet=types.SimpleNamespace())
shim=types.ModuleType('genlayer');shim.gl=gl;shim.TreeMap=Collection;shim.DynArray=Collection;sys.modules['genlayer']=shim
s=importlib.util.spec_from_file_location('contract','contracts/count_seal.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
PO=[{'description':'Steel M8 bolt sold individually','quantity':10,'unit_price':125}]
def row(status='MATCH',target=0,iq='Steel M8 bolt',oq='Steel M8 bolt'):
    return {'status':status,'target':target,'invoice_quote':iq,'order_quote':oq}
class Protocol(unittest.TestCase):
    def setUp(self):
        gl.message.sender_address=A[0];self.c=m.CountSeal();self.c.orders={};self.c.invoices={};self.c.order_ids=[]
        self.oid=self.c.create_order('test-po','Test order',A[1],'USD',m.pack(PO))
        self.original=m.match_items;m.match_items=lambda data:{'rows':[row() for _ in data['invoice']]}
    def tearDown(self): m.match_items=self.original
    def order(self): return json.loads(self.c.get_order(self.oid))
    def tx(self,actor,method,*args):
        gl.message.sender_address=A[actor];snap=copy.deepcopy(self.c.__dict__)
        try:return getattr(self.c,method)(*args)
        except Exception:
            self.c.__dict__.clear();self.c.__dict__.update(snap);raise
    def accept(self):self.tx(1,'accept_order',self.oid,self.order()['revision'],self.order()['terms_hash'])
    def receive(self,n=6):self.tx(0,'record_receipt',self.oid,self.order()['revision'],'delivery-001',m.pack([n]))
    def submit(self,ref='invoice-001',n=4,price=125):return self.tx(1,'submit_invoice',self.oid,self.order()['revision'],ref,m.pack([dict(PO[0],quantity=n,unit_price=price)]))
    def reconcile(self,iid):self.tx(1,'reconcile',iid,self.order()['revision']);return json.loads(self.c.get_invoice(iid))
    def prepared(self):self.accept();self.receive()
    def test_bilateral_terms(self):
        with self.assertRaisesRegex(Exception,'SUPPLIER_ONLY'): self.tx(0,'accept_order',self.oid,0,self.order()['terms_hash'])
        with self.assertRaisesRegex(Exception,'TERMS_NOT_ACCEPTABLE'): self.tx(1,'accept_order',self.oid,0,'bad')
        with self.assertRaisesRegex(Exception,'ORDER_NOT_ACCEPTED'): self.submit()
        self.accept();self.assertTrue(self.order()['accepted'])
    def test_buyer_only_receipts_and_cap(self):
        self.accept()
        with self.assertRaisesRegex(Exception,'BUYER_ONLY'):self.tx(1,'record_receipt',self.oid,1,'delivery-001','[2]')
        with self.assertRaisesRegex(Exception,'QUANTITY_CONSERVATION'):self.receive(11)
        self.assertEqual(self.order()['received'],[0])
        self.receive()
        with self.assertRaisesRegex(Exception,'RECEIPT_EXISTS'): self.receive()
    def test_multiple_invoices_cannot_double_consume(self):
        self.prepared();a=self.reconcile(self.submit());b=self.reconcile(self.submit('invoice-002',3))
        self.assertEqual(a['state'],'RESERVED');self.assertEqual(b['state'],'BLOCKED');self.assertEqual(self.order()['reserved'],[4])
        self.tx(0,'decide_invoice',a['id'],self.order()['revision'],True,a['content_hash'])
        self.assertEqual(self.order()['approved'],[4]);self.assertEqual(self.order()['reserved'],[0])
    def test_withdraw_and_reject_release_only_reserved(self):
        self.prepared();a=self.reconcile(self.submit());self.tx(1,'withdraw_invoice',a['id'],self.order()['revision'])
        self.assertEqual(self.order()['reserved'],[0]);b=self.reconcile(self.submit('invoice-002',6))
        self.tx(0,'decide_invoice',b['id'],self.order()['revision'],False,b['content_hash']);self.assertEqual(self.order()['reserved'],[0])
    def test_approval_binding_permissions_and_terminal(self):
        self.prepared();a=self.reconcile(self.submit())
        with self.assertRaisesRegex(Exception,'BUYER_ONLY'):self.tx(1,'decide_invoice',a['id'],self.order()['revision'],True,a['content_hash'])
        with self.assertRaisesRegex(Exception,'CONTENT_BINDING'):self.tx(0,'decide_invoice',a['id'],self.order()['revision'],True,'wrong')
        self.tx(0,'decide_invoice',a['id'],self.order()['revision'],True,a['content_hash'])
        for method,args in [('decide_invoice',(True,a['content_hash'])),('withdraw_invoice',())]:
            with self.assertRaisesRegex(Exception,'INVOICE_TERMINAL'):self.tx(0 if method=='decide_invoice' else 1,method,a['id'],self.order()['revision'],*args)
    def test_return_capacity_is_checked_against_current_allocations(self):
        self.prepared()
        original = self.order()
        self.tx(0, 'propose_return', self.oid, original['revision'], 'damaged-001', '[3]', 'Damaged threads')
        pending = self.order()
        self.assertEqual(pending['received'], [6])
        manifest = pending['returns']['damaged-001']
        invoice = self.reconcile(self.submit())
        def decide(actor=1):
            self.tx(actor, 'decide_return', self.oid, self.order()['revision'], 'damaged-001', True, manifest['content_hash'])
        with self.assertRaisesRegex(Exception, 'SUPPLIER_ONLY'):
            decide(2)
        with self.assertRaisesRegex(Exception, 'RETURN_EXCEEDS_AVAILABLE'):
            decide()
        self.tx(1, 'withdraw_invoice', invoice['id'], self.order()['revision'])
        decide()
        self.assertEqual(self.order()['received'], [3])
        self.assertEqual(self.order()['returned'], [3])
        with self.assertRaisesRegex(Exception, 'RETURN_NOT_PENDING'):
            decide()

    def test_declined_manifest_does_not_change_quantities(self):
        self.prepared()
        self.tx(0, 'propose_return', self.oid, self.order()['revision'], 'damaged-002', '[2]', 'Damaged threads')
        manifest = self.order()['returns']['damaged-002']
        with self.assertRaisesRegex(Exception, 'CONTENT_BINDING'):
            self.tx(1, 'decide_return', self.oid, self.order()['revision'], 'damaged-002', False, 'wrong')
        self.tx(1, 'decide_return', self.oid, self.order()['revision'], 'damaged-002', False, manifest['content_hash'])
        self.assertEqual(self.order()['received'], [6])
        self.assertEqual(self.order()['returned'], [0])
        self.assertEqual(self.order()['returns']['damaged-002']['state'], 'DECLINED')

    def test_price_mismatch_no_partial_reservation(self):
        self.prepared();a=self.reconcile(self.submit(price=126));self.assertEqual(a['state'],'BLOCKED');self.assertEqual(a['allocation'],[0])
        with self.assertRaisesRegex(Exception,'RESERVATION_REQUIRED'):self.tx(0,'decide_invoice',a['id'],self.order()['revision'],True,a['content_hash'])
    def test_unknown_and_ambiguity_fail_closed(self):
        self.prepared()
        for n,status in enumerate(['UNKNOWN','AMBIGUOUS','NO_MATCH']):
            m.match_items=lambda data,s=status:{'rows':[row(s,-1,oq='')]}
            a=self.reconcile(self.submit('invoice-00'+str(n+1)));self.assertEqual(a['allocation'],[0]);self.assertNotEqual(a['state'],'RESERVED')
    def test_revision_and_reference_replay(self):
        self.prepared();self.submit()
        with self.assertRaisesRegex(Exception,'STALE_REVISION'):self.tx(1,'submit_invoice',self.oid,0,'other','[]')
        with self.assertRaisesRegex(Exception,'INVOICE_EXISTS'):self.submit()
    def test_duplicate_invoice_lines_aggregate(self):
        o=self.order();o['received']=[6];inv={'lines':[dict(PO[0],quantity=4)]*2}
        r=m.allocation(o,inv,{'rows':[row(),row()]});self.assertEqual(r['status'],'BLOCKED');self.assertEqual(r['quantities'],[0])
    def test_exhaustive_quantity_boundary(self):
        for received in range(11):
            for approved in range(received+1):
                for reserved in range(received-approved+1):
                    for q in range(1,12):
                        o=self.order();o.update(received=[received],approved=[approved],reserved=[reserved]);m.invariant(o)
                        r=m.allocation(o,{'lines':[dict(PO[0],quantity=q)]},{'rows':[row()]})
                        self.assertEqual(r['status']=='RESERVED',q<=received-approved-reserved)
    def test_json_and_numeric_validation(self):
        for raw in ['{"x":1,"x":2}',m.pack([dict(PO[0],quantity=True)]),m.pack([dict(PO[0],unit_price=1.2)])]:
            with self.assertRaises(Exception):m.lines(raw)
    def test_model_forged_quote_and_target(self):
        data={'order':['Steel M8 bolt'],'invoice':['Steel M8 bolt']}
        for r in [row(iq='not present'),row(target=True),row(target=1),row('UNKNOWN',0),dict(row(),extra=1)]:
            with self.assertRaises(Exception):m.parse_match({'rows':[r]},data)
    def test_validator_requires_independent_mapping_and_audit(self):
        data={'order':['Steel M8 bolt'],'invoice':['Steel M8 bolt']};good={'rows':[row()]};bad={'rows':[row('UNKNOWN',-1,oq='')]}
        calls=[]
        def run(lead,validate):
            proposed=lead();self.assertTrue(validate(Return(proposed)));self.assertFalse(validate(Return(bad)));return proposed
        gl.nondet.exec_prompt=lambda prompt,**kwargs: {'valid':True} if prompt.startswith('Audit') else good
        gl.vm.run_nondet_unsafe=run;self.original(data)
        gl.nondet.exec_prompt=lambda prompt,**kwargs: {'valid':False} if prompt.startswith('Audit') else good
        gl.vm.run_nondet_unsafe=lambda lead,validate:self.assertFalse(validate(Return(good))) or good
        self.original(data)
if __name__=='__main__':unittest.main()

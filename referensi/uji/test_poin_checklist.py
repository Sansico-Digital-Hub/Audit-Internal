import json, sys
from playwright.sync_api import sync_playwright
FAKE = r"""
(()=>{
 const store=new Map(); const listeners=[];
 const clone=x=>x===undefined?x:JSON.parse(JSON.stringify(x));
 const deepMerge=(a,b)=>{for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])){a[k]=deepMerge(a[k]&&typeof a[k]==='object'?a[k]:{},b[k])}else a[k]=b[k]}return a};
 const docSnap=p=>({exists:store.has(p),id:p.split('/').pop(),data:()=>clone(store.get(p))});
 const notify=()=>setTimeout(()=>listeners.forEach(l=>l.fire()),0);
 const db={
  doc:p=>({get:async()=>docSnap(p),set:async d=>{store.set(p,clone(d));notify()},update:async d=>{store.set(p,deepMerge(clone(store.get(p)||{}),clone(d)));notify()},delete:async()=>{store.delete(p);notify()},
    onSnapshot:(cb)=>{const l={fire:()=>cb(docSnap(p))};listeners.push(l);setTimeout(l.fire,0)}}),
  collection:c=>({onSnapshot:(cb)=>{const fire=()=>cb({docs:[...store.keys()].filter(k=>k.startsWith(c+'/')&&k.split('/').length===2).map(k=>docSnap(k))});const l={fire};listeners.push(l);setTimeout(fire,0)}})
 };
 window.claude={use:async n=>n==='db'?db:n==='user'?{can:async()=>true}:null};
 window.__store=store; window.__notify=notify;
})();
"""
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: ok.fail=True
ok.fail=False
file=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    pg=b.new_page(viewport={'width':1280,'height':900})
    pg.route('**/*',lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(FAKE)
    pg.goto('file://'+file); pg.wait_for_timeout(400)
    # login as admin (first-time PIN setup)
    pg.fill('#l-pin','1234'); pg.click('#btn-login'); pg.wait_for_timeout(300)
    # seed an old audit
    pg.evaluate("""()=>{const ans={};for(let n=1;n<=39;n++)ans[n]=(n%9===0)?'DM':'M';
      __store.set('audits/old1',{date:'2026-10-01',areaId:'a1',areaName:'Sheeter',auditor:'A',auditee:'B',ans,finds:{},createdAt:1});__notify()}""")
    pg.wait_for_timeout(300)
    before=pg.evaluate("()=>calcOf(S.audits.find(a=>a.id==='old1')).total")
    # --- admin tab
    pg.click('[data-tab="cl"]'); pg.wait_for_timeout(200)
    ok(pg.query_selector('#btn-cl-add') is not None,'tab Poin Checklist tampil untuk admin')
    # add production point in Process
    pg.select_option('#cl-sec','process')
    pg.fill('#cl-t','Area bebas dari kebocoran oli'); pg.fill('#cl-r','1. Cek lantai sekitar mesin\n2. Tidak ada tetesan')
    pg.click('#btn-cl-add'); pg.wait_for_timeout(400)
    lst=pg.evaluate("()=>(__store.get('config/customitems')||{}).list")
    ok(lst and len(lst)==1 and lst[0]['n']==1001 and lst[0]['sec']=='process' and lst[0]['scope']=='p','poin produksi tersimpan di db (n=1001, seksi process)')
    # add unit point (Maintenance d6, only cat c0)
    pg.select_option('#cl-scope','d6'); pg.wait_for_timeout(150)
    ok(pg.evaluate("()=>document.querySelectorAll('#cl-sec option').length")==1,'seksi unit Maintenance hanya 1 pilihan')
    pg.fill('#cl-t','Kebersihan bengkel dicek tiap shift'); pg.click('#btn-cl-add'); pg.wait_for_timeout(400)
    lst=pg.evaluate("()=>(__store.get('config/customitems')||{}).list")
    ok(len(lst)==2 and lst[1]['scope']=='d6' and lst[1]['n']==1001,'poin unit tersimpan dengan penomoran sendiri (n=1001)')
    # empty text rejected
    pg.click('#btn-cl-add'); pg.wait_for_timeout(150)
    ok(len(pg.evaluate("()=>__store.get('config/customitems').list"))==2,'teks kosong ditolak')
    pg.screenshot(path='cl_tab.png',full_page=True)
    # --- form shows it
    pg.click('[data-tab="input"]'); pg.wait_for_timeout(300)
    n_items=pg.evaluate("()=>document.querySelectorAll('.item').length")
    ok(n_items==40,f'form produksi punya 40 poin (ada {n_items})')
    info=pg.evaluate("""()=>{const it=document.querySelector('#it-1001');return it?{label:it.querySelector('.num').textContent,badge:!!it.querySelector('.pill'),sec:it.closest('section').id}:null}""")
    ok(info and info['label']=='T1' and info['badge'] and info['sec']=='sec-process',f'poin T1 ada di seksi Process dengan tanda Tambahan {info}')
    # fill + save
    pg.evaluate("""()=>{S.form.auditor='Tester';S.form.auditee='X';$('#f-auditor').value='Tester';$('#f-auditee').value='X';
      FITEMS().forEach(i=>setAnswer(i.n,i.n===1001?'DM':'M'));
      S.form.find[1001]='Ada rembesan oli';S.form.photos[1001]=['data:image/jpeg;base64,/9j/4AAQSkZJRg=='];S.form.areaId='a2';}""")
    pg.click('#btn-save'); pg.wait_for_timeout(600)
    docs=pg.evaluate("()=>[...__store.keys()].filter(k=>k.startsWith('audits/')&&k!=='audits/old1')")
    ok(len(docs)==1,'audit baru tersimpan')
    if docs:
        d=pg.evaluate("(k)=>__store.get(k)",docs[0])
        ok(d['ans'].get('1001')=='DM' and '1001' in d['finds'],'jawaban dan temuan T1 tersimpan')
        calc=pg.evaluate("(k)=>{const a=S.audits.find(x=>x.id===k.split('/')[1]);const c=calcOf(a);return {total:c.total,process:c.secs[1].pts,m:c.secs[1].m,d:c.secs[1].d}}",docs[0])
        exp_proc=14/15*31
        ok(abs(calc['process']-exp_proc)<1e-6 and calc['m']==14 and calc['d']==1,f"skor Process memakai 15 poin: {calc['process']:.3f} (harap {exp_proc:.3f})")
    after=pg.evaluate("()=>calcOf(S.audits.find(a=>a.id==='old1')).total")
    ok(abs(before-after)<1e-9,f'skor audit lama tidak berubah ({before:.3f} -> {after:.3f})')
    # dashboard top-finding label
    pg.click('[data-tab="dash"]'); pg.wait_for_timeout(300)
    ok('#T1' in pg.inner_text('#view'),'dashboard menampilkan temuan #T1')
    # edit
    pg.click('[data-tab="cl"]'); pg.wait_for_timeout(200)
    pg.click('[data-clact="edit"]'); pg.wait_for_timeout(150)
    pg.fill('#cle-t','Area bebas kebocoran oli dan air'); pg.click('[data-clact="save"]'); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>__store.get('config/customitems').list[0].t")=='Area bebas kebocoran oli dan air','ubah teks poin tersimpan')
    # deactivate
    pg.click('[data-clact="toggle"]'); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>__store.get('config/customitems').list[0].active")==False,'poin dinonaktifkan')
    pg.click('[data-tab="input"]'); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('.item').length")==39,'form kembali 39 poin setelah nonaktif')
    # old+new audit still count T1 historically
    still=pg.evaluate("()=>{const a=S.audits.find(x=>x.ans&&x.ans[1001]);return calcOf(a).secs[1].d}")
    ok(still==1,'audit yang sudah menjawab T1 tetap menghitungnya setelah nonaktif')
    # unit form
    pg.click('[data-ftype="d"]'); pg.wait_for_timeout(200)
    pg.select_option('#f-unit','d6'); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('.item').length")==13,'form unit Maintenance 13 poin (12 + 1 tambahan)')
    pg.screenshot(path='unit_form.png')
    # xss check
    pg.click('[data-tab="cl"]'); pg.wait_for_timeout(150)
    pg.select_option('#cl-scope','p'); pg.select_option('#cl-sec','product')
    pg.fill('#cl-t','<img src=x onerror="window.__xss=1">'); pg.click('#btn-cl-add'); pg.wait_for_timeout(300)
    pg.click('[data-tab="input"]'); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>window.__xss")is None,'teks HTML di poin tidak dieksekusi')
    ok(not errs,f'tidak ada error JS {errs}')
    b.close()
print('ALL PASS' if not ok.fail else 'SOME FAILED')

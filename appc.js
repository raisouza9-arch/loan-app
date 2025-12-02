
/* JUROS PRO - app.js
 Full features: cadastro, edit, delete, mark paid, search, filters, dashboard calculations, export/import, notifications.
 Uses simple monthly interest (not compound).
*/

const STORAGE_KEY = 'juros_pro_v2';

function genId(){ return 'id_'+Math.random().toString(36).slice(2,9); }
function formatBRL(v){ return 'R$ ' + Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2}); }
function loadLoans(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[];}catch(e){return [];} }
function saveLoans(a){ localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); }

function calcMonthsPassed(startDate){
  const s=new Date(startDate); const now=new Date();
  let months=(now.getFullYear()-s.getFullYear())*12 + (now.getMonth()-s.getMonth());
  if(now.getDate()<s.getDate()) months-=1;
  return Math.max(0,months);
}

function calcInterestSimple(amount, monthlyRatePct, months){
  return amount * (monthlyRatePct/100) * months;
}

function projectMonths(amount, monthlyRatePct, months){
  const rows=[];
  for(let m=1;m<=months;m++){
    const interest = amount * (monthlyRatePct/100);
    const total = amount + interest;
    rows.push({month:m, interest, total});
  }
  return rows;
}

function renderList(filtered){
  const arr = filtered || loadLoans();
  const container = document.getElementById('loansList');
  container.innerHTML='';
  if(arr.length===0){ container.innerHTML='<div class="card empty">Nenhum empréstimo cadastrado.</div>'; return; }
  arr.sort((a,b)=> new Date(a.start) - new Date(b.start));
  const now=new Date();
  arr.forEach(loan=>{
    const start = new Date(loan.start);
    let nextDue = new Date(now.getFullYear(), now.getMonth(), start.getDate());
    if(nextDue < now) nextDue.setMonth(nextDue.getMonth()+1);
    const daysToDue = Math.ceil((nextDue - now)/(1000*60*60*24));
    const months = calcMonthsPassed(loan.start);
    const interestAccum = calcInterestSimple(loan.amount, loan.monthlyRate, months);
    const totalNow = loan.amount + interestAccum;
    const dueSoon = daysToDue<=1 && daysToDue>=0;
    const overdue = daysToDue<0;
    const item = document.createElement('div'); item.className='item'+(overdue?' vencido':'');
    item.innerHTML = `
      <div class="row">
        <div class="left"><strong>${loan.name}</strong><div class="small">Início: ${new Date(loan.start).toLocaleDateString('pt-BR')}</div></div>
        <div class="right"><div class="badge">${dueSoon? (daysToDue===0?'Vence hoje':'Vence amanhã') : 'Próx. venc.: '+nextDue.toLocaleDateString('pt-BR')}</div></div>
      </div>
      <div style="margin-top:8px">Valor: ${formatBRL(loan.amount)} · Taxa mensal: ${Number(loan.monthlyRate).toFixed(2)}% · Meses: ${months}</div>
      <div style="margin-top:8px">Juros acumulados: ${formatBRL(interestAccum)} · Total agora: <strong>${formatBRL(totalNow)}</strong></div>
    `;
    // projection table
    const proj = projectMonths(loan.amount, loan.monthlyRate, 12);
    let table = '<table class="table"><thead><tr><th>Mês</th><th>Juros</th><th>Total</th></tr></thead><tbody>';
    proj.forEach(r=> table += `<tr><td>${r.month}</td><td>${formatBRL(r.interest)}</td><td>${formatBRL(r.total)}</td></tr>`);
    table += '</tbody></table>';
    const projWrap=document.createElement('div'); projWrap.innerHTML = table; item.appendChild(projWrap);
    // actions
    const actions=document.createElement('div'); actions.className='actions';
    const btnEdit=document.createElement('button'); btnEdit.textContent='Editar'; btnEdit.onclick=()=> editLoan(loan.id);
    const btnDelete=document.createElement('button'); btnDelete.textContent='Excluir'; btnDelete.style.background='#bb0000'; btnDelete.onclick=()=> deleteLoan(loan.id);
    const btnPay=document.createElement('button'); btnPay.textContent='Marcar pago'; btnPay.style.background='#006600'; btnPay.onclick=()=> markPaid(loan.id);
    actions.appendChild(btnEdit); actions.appendChild(btnDelete); actions.appendChild(btnPay); item.appendChild(actions);
    container.appendChild(item);
    if(dueSoon){ showToast(`${loan.name} vence em ${daysToDue===0?'hoje':'amanhã'} (${nextDue.toLocaleDateString('pt-BR')})`); scheduleNotificationForLoan(loan); }
  });
}

function showToast(msg){
  const existing=document.getElementById('jp-toast'); if(existing) existing.remove();
  const d=document.createElement('div'); d.id='jp-toast'; d.style.position='fixed'; d.style.left='50%'; d.style.transform='translateX(-50%)'; d.style.bottom='20px'; d.style.background='#111'; d.style.color='#fff'; d.style.padding='10px 14px'; d.style.borderRadius='10px'; d.style.zIndex=9999; d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),6000);
}

function scheduleNotificationForLoan(loan){
  if(!('Notification' in window)) return;
  if(Notification.permission==='denied') return;
  if(Notification.permission!=='granted'){ Notification.requestPermission(); return; }
  const now=Date.now(); const start=new Date(loan.start);
  let nextDue=new Date((new Date()).getFullYear(), (new Date()).getMonth(), start.getDate()); if(nextDue < new Date()) nextDue.setMonth(nextDue.getMonth()+1);
  const notifyAt=new Date(nextDue); notifyAt.setDate(notifyAt.getDate()-1);
  const ms = notifyAt.getTime() - now;
  if(ms>0 && ms < 1000*60*60*24*365){ setTimeout(()=>{ new Notification('JUROS PRO — Vencimento', { body: `${loan.name} vence amanhã (${nextDue.toLocaleDateString('pt-BR')})`, icon:'icon.png' }); }, ms); }
}

function addLoanFromForm(e){ e.preventDefault(); const name=document.getElementById('nome').value.trim(); const start=document.getElementById('start').value; const value=Number(document.getElementById('value').value) || 0; const monthlyRate=Number(document.getElementById('monthlyRate').value) || 0; if(!name||!start){ alert('Preencha nome e data'); return; } const loan={ id: genId(), name, start, amount: value, monthlyRate, paid:false }; const arr=loadLoans(); arr.push(loan); saveLoans(arr); document.getElementById('loanForm').reset(); renderList(arr); }

function deleteLoan(id){ const arr=loadLoans().filter(l=> l.id!==id); saveLoans(arr); renderList(arr); }
function markPaid(id){ const arr=loadLoans().map(l=> l.id===id? Object.assign({}, l, { paid:true }) : l); saveLoans(arr); renderList(arr); }
function editLoan(id){ const arr=loadLoans(); const loan=arr.find(l=> l.id===id); if(!loan) return; document.getElementById('nome').value=loan.name; document.getElementById('start').value=loan.start; document.getElementById('value').value=loan.amount; document.getElementById('monthlyRate').value=loan.monthlyRate; deleteLoan(id); }

function onSearch(){ const term=document.getElementById('search')?.value?.toLowerCase() || ''; const arr=loadLoans(); const filtered=arr.filter(l=> l.name.toLowerCase().includes(term)); renderList(filtered); }
function filterAll(){ renderList(loadLoans()); } function filterPending(){ renderList(loadLoans().filter(l=>!l.paid)); } function filterPaid(){ renderList(loadLoans().filter(l=>l.paid)); } function filterOverdue(){ renderList(loadLoans().filter(l=>{ const start=new Date(l.start); const now=new Date(); let nextDue=new Date(now.getFullYear(), now.getMonth(), start.getDate()); if(nextDue < now) nextDue.setMonth(nextDue.getMonth()+1); return nextDue < now; })); }

function exportJSON(){ const data=JSON.stringify(loadLoans(),null,2); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='juros_pro_backup.json'; a.click(); URL.revokeObjectURL(a.href); }
function importJSON(){ const input=document.createElement('input'); input.type='file'; input.accept='.json'; input.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ try{ const data=JSON.parse(ev.target.result); saveLoans(data); renderList(data); alert('Importado com sucesso'); }catch(err){ alert('Arquivo inválido'); } }; r.readAsText(f); }; input.click(); }

document.addEventListener('DOMContentLoaded', ()=>{ document.getElementById('loanForm').addEventListener('submit', addLoanFromForm); try{ document.getElementById('exportBtn').addEventListener('click', exportJSON); }catch(e){} try{ document.getElementById('importBtn').addEventListener('click', importJSON); }catch(e){} try{ document.getElementById('clearBtn').addEventListener('click', ()=>{ if(confirm('Apagar todos?')){ saveLoans([]); renderList([]); } }); }catch(e){} if('Notification' in window && Notification.permission!=='granted' && Notification.permission!=='denied'){ Notification.requestPermission(); } renderList(loadLoans()); });

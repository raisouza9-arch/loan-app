
/* JUROS PRO - app.js
 LocalStorage based loan manager with:
 - cadastro (nome, data, valor, taxa mensal)
 - juros simples mensal (acumulado)
 - projeção 12 meses
 - editar/excluir/marcar pago
 - busca por nome
 - filtros (todos, pendentes, pagos, vencidos)
 - export/import JSON
 - aviso 1 dia antes (in-app + Notification API when granted)
*/

const STORAGE_KEY = 'juros_pro_loans_v_final';

function toNumber(v){ return Number(v) || 0; }
function formatBRL(v){ return 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function today(){ return new Date(); }
function genId(){ return 'id_' + Math.random().toString(36).slice(2,9); }

function loadLoans(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch(e){ return []; } }
function saveLoans(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

function calcMonthsPassed(startDate){
  const start = new Date(startDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear())*12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

// juros simples: juros = principal * rate * months
function calcInterestSimple(amount, monthlyRatePct, months){
  const rate = monthlyRatePct/100;
  return amount * rate * months;
}

function projectMonths(amount, monthlyRatePct, months){
  const rows = [];
  let principal = amount;
  const rate = monthlyRatePct/100;
  for(let m=1; m<=months; m++){
    const interest = principal * rate;
    const total = principal + interest;
    rows.push({ month: m, interest, total });
  }
  return rows;
}

function renderList(filtered){
  const list = document.getElementById('loansList');
  const loans = filtered || loadLoans();
  list.innerHTML = '';
  if(loans.length === 0){ list.innerHTML = '<div class="card empty">Nenhum empréstimo cadastrado.</div>'; return; }

  // sort by next due date
  loans.sort((a,b)=> new Date(a.start) - new Date(b.start));

  const now = new Date();
  loans.forEach((loan, idx) => {
    const start = new Date(loan.start);
    const nextDue = new Date(now.getFullYear(), now.getMonth(), start.getDate());
    if(nextDue < now) nextDue.setMonth(nextDue.getMonth()+1);
    const daysToDue = Math.ceil((nextDue - now)/(1000*60*60*24));

    const months = calcMonthsPassed(loan.start);
    const interestAccum = calcInterestSimple(loan.amount, loan.monthlyRate, months);
    const totalNow = loan.amount + interestAccum;

    const overdue = daysToDue < 0;
    const dueSoon = daysToDue <= 1 && daysToDue >= 0;

    const item = document.createElement('div');
    item.className = 'item' + (overdue ? ' vencido' : '');
    item.innerHTML = `
      <div class="row">
        <div class="left">
          <strong>${loan.name}</strong><div class="small">Início: ${new Date(loan.start).toLocaleDateString('pt-BR')}</div>
        </div>
        <div class="right">
          <div class="badge">${dueSoon ? (daysToDue===0? 'Vence hoje' : 'Vence amanhã') : 'Próx. venc.: ' + nextDue.toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
      <div style="margin-top:8px">
        Valor: ${formatBRL(loan.amount)} · Juros mensal: ${Number(loan.monthlyRate).toFixed(2)}% · Meses: ${months}
      </div>
      <div style="margin-top:8px">
        Juros acumulados: ${formatBRL(interestAccum)} · Total agora: <strong>${formatBRL(totalNow)}</strong>
      </div>
    `;

    // projection table (12 months)
    const proj = projectMonths(loan.amount, loan.monthlyRate, 12);
    let table = '<table class="table"><thead><tr><th>Mês</th><th>Juros</th><th>Total</th></tr></thead><tbody>';
    proj.forEach(r=>{ table += `<tr><td>${r.month}</td><td>${formatBRL(r.interest)}</td><td>${formatBRL(r.total)}</td></tr>`; });
    table += '</tbody></table>';
    const projWrap = document.createElement('div');
    projWrap.innerHTML = table;
    item.appendChild(projWrap);

    // actions
    const actions = document.createElement('div');
    actions.className = 'actions';
    const btnEdit = document.createElement('button'); btnEdit.textContent = 'Editar'; btnEdit.onclick = ()=> editLoan(loan.id);
    const btnDelete = document.createElement('button'); btnDelete.textContent = 'Excluir'; btnDelete.style.background='#bb0000'; btnDelete.onclick = ()=> deleteLoan(loan.id);
    const btnPay = document.createElement('button'); btnPay.textContent = 'Marcar pago'; btnPay.style.background='#006600'; btnPay.onclick = ()=> markPaid(loan.id);
    actions.appendChild(btnEdit); actions.appendChild(btnDelete); actions.appendChild(btnPay);
    item.appendChild(actions);

    list.appendChild(item);

    // in-app alert and notification scheduling when loaded
    if(dueSoon){
      showToast(`${loan.name} vence em ${daysToDue===0? 'hoje' : 'amanhã'} (${nextDue.toLocaleDateString('pt-BR')})`);
      scheduleNotificationForLoan(loan);
    }
  });
}

function showToast(msg){
  const existing = document.getElementById('jp-toast');
  if(existing) existing.remove();
  const d = document.createElement('div'); d.id='jp-toast';
  d.style.position='fixed'; d.style.left='50%'; d.style.transform='translateX(-50%)'; d.style.bottom='20px';
  d.style.background='#111'; d.style.color='#fff'; d.style.padding='10px 14px'; d.style.borderRadius='10px'; d.style.zIndex=9999;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(()=>{ d.remove(); }, 6000);
}

function scheduleNotificationForLoan(loan){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'denied') return;
  if(Notification.permission !== 'granted'){
    Notification.requestPermission();
    return;
  }
  const now = Date.now();
  const start = new Date(loan.start);
  let nextDue = new Date((new Date()).getFullYear(), (new Date()).getMonth(), start.getDate());
  if(nextDue < new Date()) nextDue.setMonth(nextDue.getMonth()+1);
  const notifyAt = new Date(nextDue); notifyAt.setDate(notifyAt.getDate() - 1);
  const ms = notifyAt.getTime() - now;
  if(ms > 0 && ms < 1000*60*60*24*365){
    setTimeout(()=>{
      new Notification('JUROS PRO — Vencimento', { body: `${loan.name} vence amanhã (${nextDue.toLocaleDateString('pt-BR')})`, icon: 'icon.png' });
    }, ms);
  }
}

function addLoan(e){
  e.preventDefault();
  const name = document.getElementById('nome').value.trim();
  const start = document.getElementById('start').value;
  const value = parseFloat(document.getElementById('value').value) || 0;
  const monthlyRate = parseFloat(document.getElementById('monthlyRate').value) || 0;

  const loan = {
    id: genId(),
    name,
    start,
    amount: Number(value),
    monthlyRate: Number(monthlyRate),
    paid: false
  };

  const arr = loadLoans();
  arr.push(loan);
  saveLoans(arr);
  document.getElementById('loanForm').reset();
  renderList(arr);
}

function deleteLoan(id){
  let arr = loadLoans().filter(l => l.id !== id);
  saveLoans(arr);
  renderList(arr);
}

function markPaid(id){
  let arr = loadLoans();
  arr = arr.map(l=> l.id===id ? Object.assign({}, l, { paid: true }) : l);
  saveLoans(arr);
  renderList(arr);
}

function editLoan(id){
  const arr = loadLoans();
  const loan = arr.find(l=> l.id===id);
  if(!loan) return;
  document.getElementById('nome').value = loan.name;
  document.getElementById('start').value = loan.start;
  document.getElementById('value').value = loan.amount;
  document.getElementById('monthlyRate').value = loan.monthlyRate;
  deleteLoan(id);
}

function onSearch(){
  const term = document.getElementById('search').value.toLowerCase();
  const arr = loadLoans();
  const filtered = arr.filter(l => l.name.toLowerCase().includes(term));
  renderList(filtered);
}

function filterAll(){ renderList(loadLoans()); }
function filterPending(){ renderList(loadLoans().filter(l=> !l.paid)); }
function filterPaid(){ renderList(loadLoans().filter(l=> l.paid)); }
function filterOverdue(){ renderList(loadLoans().filter(l=>{
  const start = new Date(l.start); const now = new Date();
  let nextDue = new Date(now.getFullYear(), now.getMonth(), start.getDate());
  if(nextDue < now) nextDue.setMonth(nextDue.getMonth()+1);
  return nextDue < now;
})); }

function exportJSON(){
  const data = JSON.stringify(loadLoans(), null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='juros_pro_backup.json'; a.click();
  URL.revokeObjectURL(url);
}
function importJSON(){
  const input = document.createElement('input'); input.type='file'; input.accept='.json';
  input.onchange = e => {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try{
        const data = JSON.parse(ev.target.result);
        saveLoans(data);
        renderList(data);
        alert('Importado com sucesso');
      }catch(err){ alert('Arquivo inválido') }
    };
    r.readAsText(f);
  };
  input.click();
}

document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('loanForm');
  form.addEventListener('submit', addLoan);
  document.getElementById('exportBtn').addEventListener('click', exportJSON);
  document.getElementById('importBtn').addEventListener('click', importJSON);
  document.getElementById('clearBtn').addEventListener('click', ()=>{ if(confirm('Apagar todos?')){ saveLoans([]); renderList([]);} });
  if('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied'){
    Notification.requestPermission();
  }
  renderList(loadLoans());
});

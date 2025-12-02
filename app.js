
// Simple loans app (localStorage)
// Data format: loans = [{id,name,date,value,interest,paid_month,createdAt}]

function qs(sel){return document.querySelector(sel);}
function qsa(sel){return Array.from(document.querySelectorAll(sel));}

const elems = {
  dashboard: qs('#dashboard'),
  new: qs('#new'),
  list: qs('#list'),
  totalLoans: qs('#total-loans'),
  totalInterest: qs('#total-interest'),
  totalPaid: qs('#total-paid'),
  chart: qs('#chart'),
  search: qs('#search'),
  openDashboard: qs('#open-dashboard'),
  openNew: qs('#open-new'),
  save: qs('#save'),
  cancel: qs('#cancel'),
  name: qs('#name'),
  date: qs('#date'),
  value: qs('#value'),
  interest: qs('#interest'),
  paid_month: qs('#paid_month')
};

function loadLoans(){return JSON.parse(localStorage.getItem('juros_pro_loans')||'[]');}
function saveLoans(arr){localStorage.setItem('juros_pro_loans', JSON.stringify(arr));}

function goto(screen){
  qsa('.screen').forEach(s=>s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function formatCurrency(v){ return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function calcInterest(value, monthlyRatePercent, months){
  const r = monthlyRatePercent/100;
  return value * (Math.pow(1+r, months)-1);
}

function renderList(filter=''){
  const list = loadLoans()
    .filter(l=>l.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  elems.list.innerHTML = '';
  list.forEach(l=>{
    const div = document.createElement('div');
    div.className='record';
    const dLoan = new Date(l.date);
    const created = new Date(l.createdAt);
    const monthsElapsed = Math.max(0, Math.floor((new Date() - new Date(l.date)) / (1000*60*60*24*30)));
    const interestAccum = calcInterest(l.value, l.interest, monthsElapsed);
    const paidInfo = l.paid_month ? '<div>Mês pago: '+l.paid_month+'</div>' : '';
    div.innerHTML = `
      <div style="font-weight:800;font-size:20px">${l.name.toUpperCase()}</div>
      <div>Valor: ${formatCurrency(l.value)}</div>
      <div>Juros: ${l.interest}%</div>
      <div>Data do empréstimo: ${dLoan.toLocaleDateString()}</div>
      ${paidInfo}
      <div style="margin-top:6px;color:var(--accent)">Juros acumulados aproximados: ${formatCurrency(interestAccum)}</div>
    `;
    elems.list.appendChild(div);
  });
  renderDashboard();
}

function renderDashboard(){
  const loans = loadLoans();
  const total = loans.reduce((s,l)=>s+Number(l.value),0);
  const totalInterest = loans.reduce((s,l)=>{
    const monthsElapsed = Math.max(0, Math.floor((new Date() - new Date(l.date)) / (1000*60*60*24*30)));
    return s + calcInterest(l.value, l.interest, monthsElapsed);
  },0);
  const totalPaid = loans.filter(l=>l.paid_month).reduce((s,l)=>{
    // For simplicity assume one month paid interest = value * rate
    return s + (l.value * (Number(l.interest)/100));
  },0);
  elems.totalLoans.textContent = formatCurrency(total);
  elems.totalInterest.textContent = formatCurrency(totalInterest);
  elems.totalPaid.textContent = formatCurrency(totalPaid);

  // simple chart: total interest per month (last 6 months)
  const ctx = elems.chart.getContext('2d');
  const w = elems.chart.width, h = elems.chart.height;
  ctx.clearRect(0,0,w,h);
  const now = new Date();
  const months = Array.from({length:6}).map((_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()- (5-i), 1);
    return {label: d.toLocaleString('pt-BR',{month:'short',year:'2-digit'}), value:0};
  });
  loans.forEach(l=>{
    const monthsElapsed = Math.max(0, Math.floor((new Date() - new Date(l.date)) / (1000*60*60*24*30)));
    for(let i=0;i<months.length;i++){
      // crude approach: allocate interest proportionally if loan started before month
      const mOffset = (new Date().getFullYear()-new Date(l.date).getFullYear())*12 + (new Date().getMonth()-new Date(l.date).getMonth());
      if(mOffset >= (5-i)) {
        // simple monthly interest amount
        const monthly = l.value * (l.interest/100);
        months[i].value += monthly;
      }
    }
  });
  // draw bars
  const padding = 20;
  const max = Math.max(1, ...months.map(m=>m.value));
  const barW = (w - padding*2) / months.length * 0.7;
  months.forEach((m,i)=>{
    const x = padding + i * ((w - padding*2) / months.length) + 10;
    const hbar = (m.value / max) * (h - 60);
    ctx.fillStyle = '#ffd400';
    ctx.fillRect(x, h - 40 - hbar, barW, hbar);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(m.label, x, h - 20);
  });
}

// handlers
elems.openDashboard.addEventListener('click', ()=>{goto(elems.dashboard); renderList('');});
elems.openNew.addEventListener('click', ()=>{goto(elems.new);});
elems.cancel.addEventListener('click', ()=>{goto(elems.dashboard);});
elems.save.addEventListener('click', ()=>{
  const name = elems.name.value.trim();
  const date = elems.date.value;
  const value = Number(elems.value.value || 0);
  const interest = Number(elems.interest.value || 0);
  const paid_month = elems.paid_month.value || null;
  if(!name || !date || value<=0){ alert('Preencha nome, data e valor corretamente.'); return; }
  const loans = loadLoans();
  loans.push({id:Date.now(),name,date,value,interest,paid_month,createdAt:new Date().toISOString()});
  saveLoans(loans);
  elems.name.value=''; elems.date.value=''; elems.value.value=''; elems.interest.value=''; elems.paid_month.value='';
  goto(elems.dashboard);
  renderList(elems.search.value);
});

elems.search.addEventListener('input', (e)=>{renderList(e.target.value);});

// init
goto(elems.dashboard);
renderList('');

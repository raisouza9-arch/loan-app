
/* JUROS PRO - Full app JS */
const STORAGE_KEY = 'juros_pro_real_v1';
let loans = [];
let editingId = null;
let chart = null;

document.addEventListener('DOMContentLoaded', ()=>{
  // tabs
  document.getElementById('tab-dashboard').addEventListener('click', ()=>showTab('dashboard'));
  document.getElementById('tab-new').addEventListener('click', ()=>showTab('new'));
  document.getElementById('tab-list').addEventListener('click', ()=>showTab('list'));

  // form
  document.getElementById('loan-form').addEventListener('submit', onSubmit);
  document.getElementById('add-paid-month').addEventListener('click', addPaidMonthFromInput);
  document.getElementById('paidMonthInput').addEventListener('keypress', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addPaidMonthFromInput(); }});

  // modal
  document.getElementById('m-save').addEventListener('click', saveModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);

  // search
  document.getElementById('search').addEventListener('input', renderList);
  document.getElementById('clearSearch').addEventListener('click', ()=>{ document.getElementById('search').value=''; renderList(); });

  // load
  load();
  renderAll();
  registerSW();
  try{ requestNotificationPermission(); }catch(e){}
});

function showTab(tab){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  document.getElementById('tab-'+tab).classList.add('active');
  document.getElementById(tab).classList.remove('hidden');
  renderAll();
}

function load(){
  try{ loans = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ loans = []; }
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
  renderAll();
}

// form submit
function onSubmit(e){
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const date = document.getElementById('date').value;
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const rate = parseFloat(document.getElementById('rate').value) || 0;
  const paidMonths = getPaidMonthsFromList();

  if(!name || !date || amount<=0){ alert('Preencha nome, data e valor corretamente.'); return; }

  const id = 'l'+Date.now();
  loans.unshift({ id, name, date, amount, rate, paidMonths });
  save();
  document.getElementById('loan-form').reset();
  document.getElementById('paid-months-list').innerHTML='';
  showTab('list');
  scheduleReminderForLoan({id,name,date,amount,rate});
}

function addPaidMonthFromInput(){
  const m = document.getElementById('paidMonthInput').value;
  if(!m){ alert('Escolha o mês no campo ao lado ou use o botão'); return; }
  const list = document.getElementById('paid-months-list');
  if(Array.from(list.children).some(ch=>ch.dataset.month===m)) return;
  const pill = document.createElement('div');
  pill.className='month-pill';
  pill.dataset.month = m;
  pill.innerHTML = `<span>${m}</span><button aria-label="remover mês">✖</button>`;
  pill.querySelector('button').addEventListener('click', ()=>{ pill.remove(); });
  list.appendChild(pill);
  document.getElementById('paidMonthInput').value='';
}

function getPaidMonthsFromList(){
  return Array.from(document.querySelectorAll('#paid-months-list .month-pill')).map(p=>p.dataset.month);
}

// render functions
function renderAll(){
  renderDashboard();
  renderList();
  renderChart();
}

function renderDashboard(){
  const totalLoans = loans.reduce((s,l)=>s + Number(l.amount||0),0);
  const totalReceived = loans.reduce((s,l)=> s + ((l.paidMonths||[]).length * (l.amount*(l.rate/100))), 0);
  const totalAccum = totalLoans + totalReceived;
  document.getElementById('total-loans').textContent = formatBR(totalLoans);
  document.getElementById('total-interest-received').textContent = formatBR(totalReceived);
  document.getElementById('total-accumulated').textContent = formatBR(totalAccum);
}

function renderList(){
  const container = document.getElementById('loans-list');
  container.innerHTML='';
  const q = document.getElementById('search').value.trim().toLowerCase();
  loans.filter(l=> l.name.toLowerCase().includes(q)).forEach(l=>{
    const el = document.createElement('div'); el.className='loan';
    const months = (l.paidMonths||[]).length;
    const interestReceived = months * (l.amount*(l.rate/100));
    el.innerHTML = `<h4>${escapeHtml(l.name)}</h4>
      <p>Valor: R$ ${formatNumber(l.amount)}</p>
      <p>Taxa: ${formatNumber(l.rate)}%</p>
      <p>Meses pagos: ${months>0? (l.paidMonths||[]).join(', '): 'Nenhum'}</p>
      <p>Juros recebidos: R$ ${formatNumber(interestReceived)}</p>
      <div class="actions">
        <button class="edit" data-id="${l.id}">Editar</button>
        <button class="del" data-id="${l.id}">Apagar</button>
      </div>`;
    el.querySelector('.edit').addEventListener('click', ()=>openModal(l.id));
    el.querySelector('.del').addEventListener('click', ()=>{ if(confirm('Apagar esse cadastro?')){ deleteLoan(l.id); } });
    container.appendChild(el);
  });
}

function openModal(id){
  editingId = id;
  const loan = loans.find(x=>x.id===id);
  if(!loan) return;
  document.getElementById('m-name').value = loan.name;
  document.getElementById('m-date').value = loan.date;
  document.getElementById('m-amount').value = loan.amount;
  document.getElementById('m-rate').value = loan.rate;
  document.getElementById('m-paid').value = (loan.paidMonths||[]).join(',');
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal(){
  editingId = null;
  document.getElementById('modal').classList.add('hidden');
}

function saveModal(){
  const loan = loans.find(x=>x.id===editingId);
  if(!loan) return;
  loan.name = document.getElementById('m-name').value.trim();
  loan.date = document.getElementById('m-date').value;
  loan.amount = parseFloat(document.getElementById('m-amount').value) || 0;
  loan.rate = parseFloat(document.getElementById('m-rate').value) || 0;
  loan.paidMonths = document.getElementById('m-paid').value.split(',').map(s=>s.trim()).filter(Boolean);
  save();
  closeModal();
}

function deleteLoan(id){
  loans = loans.filter(x=>x.id!==id);
  save();
}

function renderChart(){
  const map = {};
  loans.forEach(l=>{
    (l.paidMonths||[]).forEach(m=>{
      map[m] = (map[m]||0) + (l.amount*(l.rate/100));
    });
  });
  const months = Object.keys(map).sort();
  const values = months.map(m=>Number(map[m].toFixed(2)));
  const ctx = document.getElementById('chart-months').getContext('2d');
  if(window._jurosChart) window._jurosChart.destroy();
  window._jurosChart = new Chart(ctx, {
    type:'bar',
    data:{ labels: months.length? months: ['Nenhum'], datasets:[{ label:'Juros (R$)', data: months.length? values:[0], backgroundColor:'#FFD400' }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ ticks:{ color:'#fff' } }, x:{ ticks:{ color:'#fff' } } } }
  });
}

// helpers
function formatBR(v){ return 'R$ ' + formatNumber(v); }
function formatNumber(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function numberFormat(v){ return formatNumber(v); }
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

// simple notifications while app open
function requestNotificationPermission(){ if(!('Notification' in window)) return; if(Notification.permission==='default') Notification.requestPermission(); }
function scheduleReminderForLoan(loan){
  try{
    if(Notification.permission!=='granted') return;
    const loanDate = new Date(loan.date);
    const now = new Date();
    let next = new Date(now.getFullYear(), now.getMonth(), loanDate.getDate());
    if(next <= now) next = new Date(now.getFullYear(), now.getMonth()+1, loanDate.getDate());
    const remindAt = new Date(next.getTime() - 24*60*60*1000);
    const ms = remindAt.getTime() - Date.now();
    if(ms>0 && ms < 1000*60*60*24*365) setTimeout(()=> new Notification('Juros Pro', { body: `Vencimento amanhã: ${loan.name} (R$ ${formatNumber(loan.amount)})` }), ms);
  }catch(e){console.log(e)}
}

// service worker registration
function registerSW(){ if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').catch(()=>{}); } }

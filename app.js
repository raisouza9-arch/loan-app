// app.js - logic for JUROS PRO
const nameEl = document.getElementById('name');
const dateEl = document.getElementById('date');
const valueEl = document.getElementById('value');
const rateEl = document.getElementById('rate');
const addMonthBtn = document.getElementById('addMonthBtn');
const monthsContainer = document.getElementById('monthsContainer');
const saveBtn = document.getElementById('saveBtn');
const recordsEl = document.getElementById('records');

const modal = document.getElementById('modal');
const editName = document.getElementById('edit-name');
const editDate = document.getElementById('edit-date');
const editValue = document.getElementById('edit-value');
const editRate = document.getElementById('edit-rate');
const editMonthsList = document.getElementById('edit-months-list');
const editMonthInput = document.getElementById('edit-month-input');
const editAddMonth = document.getElementById('edit-add-month');
const editSave = document.getElementById('edit-save');
const editCancel = document.getElementById('edit-cancel');

let currentMonths = []; // for new record months
let records = JSON.parse(localStorage.getItem('jp_records')||'[]');
let editingId = null;

// helper
function renderMonths(container, months, removable=true, onRemove){
  container.innerHTML='';
  months.forEach(m=>{
    const pill = document.createElement('div');pill.className='month-pill';
    pill.textContent = m;
    if(removable){
      const btn = document.createElement('button'); btn.textContent='✖'; btn.onclick=()=>{
        if(onRemove) onRemove(m);
      };
      pill.appendChild(btn);
    }
    container.appendChild(pill);
  });
}

// add month for new record
addMonthBtn.addEventListener('click', ()=>{
  const input = document.createElement('input');
  input.type='month';
  input.onchange = ()=>{
    if(input.value && !currentMonths.includes(input.value)){
      currentMonths.push(input.value);
      renderMonths(monthsContainer, currentMonths, true, (m)=>{ currentMonths = currentMonths.filter(x=>x!==m); renderMonths(monthsContainer,currentMonths,true,(m)=>{currentMonths=currentMonths.filter(x=>x!==m); renderMonths(monthsContainer,currentMonths,true);}); });
    }
    input.remove();
  };
  input.click();
  document.body.appendChild(input);
});

// save new record
saveBtn.addEventListener('click', ()=>{
  const name = nameEl.value.trim();
  const date = dateEl.value;
  const value = parseFloat(valueEl.value) || 0;
  const rate = parseFloat(rateEl.value) || 0;
  if(!name||!date||value<=0){ alert('Preencha nome, data e valor corretamente.'); return; }
  const id = Date.now().toString();
  const rec = {id,name,date,value,rate,months:currentMonths.slice()};
  records.unshift(rec);
  localStorage.setItem('jp_records', JSON.stringify(records));
  // reset form
  nameEl.value=''; dateEl.value=''; valueEl.value=''; rateEl.value='';
  currentMonths = []; renderMonths(monthsContainer, currentMonths);
  renderRecords();
});

// render records
function calcInterest(principal, rate, months){
  // compound interest total interest
  const n = months;
  const r = rate/100;
  const total = principal*(Math.pow(1+r,n)-1);
  return Math.round(total*100)/100;
}

function renderRecords(){
  recordsEl.innerHTML='';
  records.forEach(rec=>{
    const card = document.createElement('div'); card.className='card';
    const title = document.createElement('h3'); title.textContent = rec.name.toUpperCase();
    const p1 = document.createElement('p'); p1.textContent = 'Valor: R$ ' + (rec.value.toLocaleString('pt-BR'));
    const p2 = document.createElement('p'); p2.textContent = 'Juros: ' + rec.rate + '%';
    const monthsPaid = rec.months.length;
    const p3 = document.createElement('p');
    p3.textContent = 'Meses pagos: ' + (monthsPaid ? rec.months.join(', ') : 'Nenhum');
    const interest = calcInterest(rec.value, rec.rate, monthsPaid);
    const p4 = document.createElement('p'); p4.textContent = 'Total juros no período: R$ ' + interest.toLocaleString('pt-BR');
    card.appendChild(title); card.appendChild(p1); card.appendChild(p2); card.appendChild(p3); card.appendChild(p4);

    const actions = document.createElement('div'); actions.className='actions';
    const editBtn = document.createElement('button'); editBtn.className='small-btn'; editBtn.textContent='Editar'; editBtn.onclick=()=>openEdit(rec.id);
    const delBtn = document.createElement('button'); delBtn.className='small-btn'; delBtn.textContent='Apagar'; delBtn.onclick=()=>{ if(confirm('Apagar este registro?')){ records = records.filter(r=>r.id!==rec.id); localStorage.setItem('jp_records', JSON.stringify(records)); renderRecords(); } };
    actions.appendChild(editBtn); actions.appendChild(delBtn);
    card.appendChild(actions);
    recordsEl.appendChild(card);
  });
}

// edit flow
function openEdit(id){
  editingId = id;
  const rec = records.find(r=>r.id===id);
  if(!rec) return;
  editName.value = rec.name;
  editDate.value = rec.date;
  editValue.value = rec.value;
  editRate.value = rec.rate;
  editMonthsList.dataset.id = id;
  renderMonths(editMonthsList, rec.months, true, (m)=>{
    // remove month from that record in UI (not saved until save)
    rec.months = rec.months.filter(x=>x!==m);
    renderMonths(editMonthsList, rec.months, true, (mm)=>{ rec.months = rec.months.filter(x=>x!==mm); renderMonths(editMonthsList, rec.months, true); });
  });
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
}

editAddMonth.addEventListener('click', ()=>{
  const val = editMonthInput.value;
  if(!val) return alert('Escolha mês');
  const rec = records.find(r=>r.id===editingId);
  if(!rec) return;
  if(!rec.months.includes(val)){ rec.months.push(val); }
  renderMonths(editMonthsList, rec.months, true, (m)=>{ rec.months = rec.months.filter(x=>x!==m); renderMonths(editMonthsList, rec.months, true); });
  editMonthInput.value='';
});

editSave.addEventListener('click', ()=>{
  const rec = records.find(r=>r.id===editingId);
  if(!rec) return;
  rec.name = editName.value.trim();
  rec.date = editDate.value;
  rec.value = parseFloat(editValue.value)||0;
  rec.rate = parseFloat(editRate.value)||0;
  // months already updated via add/remove
  localStorage.setItem('jp_records', JSON.stringify(records));
  modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true');
  renderRecords();
});

editCancel.addEventListener('click', ()=>{
  modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true');
  editingId = null;
});

// initial render
renderMonths(monthsContainer, currentMonths);
renderRecords();

// Optional: try to register service worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}

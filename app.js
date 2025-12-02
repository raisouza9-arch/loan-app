
// Simple single-file app logic using localStorage
const storageKey = "jurospro_loans_v1";

function $(id){return document.getElementById(id);}

let loans = [];

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

function load(){
  const raw = localStorage.getItem(storageKey);
  loans = raw?JSON.parse(raw):[];
}
function save(){
  localStorage.setItem(storageKey, JSON.stringify(loans));
  updateList();
  updateSummary();
}

function parseDateInput(val){
  return val ? new Date(val + "T00:00:00") : null;
}

function monthsBetween(d1,d2){
  // returns number of months from d1 to d2 (rounded down)
  if(!d1 || !d2) return 0;
  const y = (d2.getFullYear() - d1.getFullYear());
  const m = (d2.getMonth() - d1.getMonth());
  return y*12 + m;
}

function computeAccumulatedInterest(loan){
  const start = new Date(loan.date);
  const now = new Date();
  const months = monthsBetween(start, now);
  const r = loan.rate/100;
  const fv = loan.amount * Math.pow(1 + r, months);
  return {months, interest: fv - loan.amount, fv};
}

function updateSummary(){
  let totalInterest = 0;
  loans.forEach(l=>{
    const v = computeAccumulatedInterest(l);
    totalInterest += v.interest;
  });
  $("totalInterest").textContent = "Total juros acumulado: R$ " + totalInterest.toFixed(2);
}

function formatDateISO(date){
  if(!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString();
}

function updateList(filter){
  const list = $("list");
  list.innerHTML = "";
  const q = (filter||"").toLowerCase();
  loans.filter(l=>!q || l.name.toLowerCase().includes(q)).forEach(l=>{
    const div = document.createElement("div");
    div.className = "card";
    const acc = computeAccumulatedInterest(l);
    div.innerHTML = `<h3>${l.name}</h3>
      <div>Valor: R$ ${Number(l.amount).toFixed(2)}</div>
      <div>Juros: ${Number(l.rate)}%</div>
      <div>Data: ${formatDateISO(l.date)}</div>
      <div>Meses desde o empréstimo: ${acc.months}</div>
      <div>Juros acumulado: R$ ${acc.interest.toFixed(2)}</div>
      <div class="actions">
        <button class="small" data-id="${l.id}" onclick="editLoan('${l.id}')">Editar</button>
        <button class="small" data-id="${l.id}" onclick="deleteLoan('${l.id}')">Apagar</button>
        <button class="small" data-id="${l.id}" onclick="markPaid('${l.id}')">Marcar mês pago</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function addLoan(){
  const name = $("name").value.trim();
  const date = $("date").value;
  const amount = parseFloat($("amount").value) || 0;
  const rate = parseFloat($("rate").value) || 0;
  if(!name || !date || !amount){ alert("Preencha nome, data e valor."); return; }
  const loan = { id: uid(), name, date, amount, rate, payments: [] };
  loans.unshift(loan);
  save();
  clearForm();
  scheduleNotifications();
}

function clearForm(){
  $("name").value=""; $("date").value=""; $("amount").value=""; $("rate").value="";
}

function deleteLoan(id){
  if(!confirm("Apagar este registro?")) return;
  loans = loans.filter(x=>x.id!==id);
  save();
}

function editLoan(id){
  const loan = loans.find(x=>x.id===id);
  if(!loan) return;
  $("modal").classList.remove("hidden");
  $("editName").value = loan.name;
  $("editDate").value = loan.date;
  $("editAmount").value = loan.amount;
  $("editRate").value = loan.rate;
  $("editPayments").value = (loan.payments||[]).join(",");
  $("saveEdit").onclick = ()=>{
    loan.name = $("editName").value.trim();
    loan.date = $("editDate").value;
    loan.amount = parseFloat($("editAmount").value)||0;
    loan.rate = parseFloat($("editRate").value)||0;
    loan.payments = $("editPayments").value.split(",").map(s=>s.trim()).filter(s=>s);
    save();
    $("modal").classList.add("hidden");
  };
  $("cancelEdit").onclick = ()=>{$("modal").classList.add("hidden");};
}

function markPaid(id){
  const loan = loans.find(x=>x.id===id);
  if(!loan) return;
  const month = prompt("Informe o mês pago (YYYY-MM), ex: 2025-12");
  if(!month) return;
  loan.payments = loan.payments || [];
  if(!loan.payments.includes(month)) loan.payments.push(month);
  save();
}

function backupExport(){
  const data = JSON.stringify(loans, null, 2);
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jurospro_backup_" + new Date().toISOString().slice(0,10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importFile(file){
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const data = JSON.parse(e.target.result);
      if(Array.isArray(data)){
        // merge preserving unique ids
        const existingIds = new Set(loans.map(l=>l.id));
        data.forEach(d=>{
          if(!d.id) d.id = uid();
          if(!existingIds.has(d.id)) loans.push(d);
        });
        save();
        alert("Importado com sucesso.");
      } else {
        alert("Arquivo inválido.");
      }
    }catch(err){ alert("Erro ao ler arquivo."); }
  };
  reader.readAsText(file);
}

function scheduleNotifications(){
  // Request permission and show immediate check for next-day due items
  if(!("Notification" in window)) return;
  Notification.requestPermission().then(perm=>{
    if(perm!=='granted') return;
    // find loans with due date +1 day from today (based on loan day of month)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24*60*60*1000);
    const dayT = tomorrow.getDate();
    loans.forEach(l=>{
      const loanDate = new Date(l.date);
      // due day each month: same day number as loan
      if(loanDate.getDate() === dayT){
        const title = "Vencimento amanhã: " + l.name;
        const body = `Valor: R$ ${Number(l.amount).toFixed(2)} - juros ${l.rate}%`;
        new Notification(title, {body, icon:"icon.png"});
      }
    });
  });
}

// Search
$("search")?.addEventListener("input", e=>updateList(e.target.value));
$("clearSearch")?.addEventListener("click", ()=>{ $("search").value=''; updateList(); });

// Buttons
$("saveBtn").addEventListener("click", addLoan);
$("backupBtn").addEventListener("click", backupExport);
$("importBtn").addEventListener("click", ()=>$("importFile").click());
$("importFile").addEventListener("change", e=>{ if(e.target.files[0]) importFile(e.target.files[0]); });

// on load
load();
updateList();
updateSummary();
scheduleNotifications();

// Register service worker (for PWA and notifications)
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}

let dados = JSON.parse(localStorage.getItem('cadastros')||'[]');

function atualizarDashboard(){
 let totalEmp = dados.reduce((a,b)=>a+Number(b.valor||0),0);
 let totalJuros = dados.reduce((a,b)=>a+Number(b.jurosRecebidos||0),0);
 document.getElementById('totalEmprestado').innerText = totalEmp.toFixed(2);
 document.getElementById('totalJuros').innerText = totalJuros.toFixed(2);
 document.getElementById('totalAcumulado').innerText = (totalEmp+totalJuros).toFixed(2);
}

window.onload = ()=>{ if(document.getElementById('totalEmprestado')) atualizarDashboard(); };

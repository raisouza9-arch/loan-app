function listar(){
 let dados = JSON.parse(localStorage.getItem('cadastros')||'[]');
 let q = document.getElementById('busca').value.toLowerCase();
 let fil = dados.filter(x=>x.nome.toLowerCase().includes(q));

 let html = fil.map((c,i)=>`
   <div class='card'>
     <h3>${c.nome}</h3>
     <p>Valor: ${c.valor}</p>
     <p>Mês: ${c.mes}</p>
     <button onclick="remover(${i})">Excluir</button>
   </div>
 `).join('');

 document.getElementById('lista').innerHTML = html;
}

function remover(i){
 let dados = JSON.parse(localStorage.getItem('cadastros')||'[]');
 dados.splice(i,1);
 localStorage.setItem('cadastros',JSON.stringify(dados));
 listar();
}

window.onload=listar;

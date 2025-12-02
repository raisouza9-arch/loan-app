function salvar(){
 let dados = JSON.parse(localStorage.getItem('cadastros')||'[]');
 dados.push({
   nome: document.getElementById('nome').value,
   valor: Number(document.getElementById('valor').value),
   mes: document.getElementById('mes').value,
   jurosRecebidos: 0
 });
 localStorage.setItem('cadastros', JSON.stringify(dados));
 alert('Salvo!');
 window.location='index.html';
}

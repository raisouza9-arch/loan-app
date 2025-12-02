function load(){
let lista=document.getElementById("lista");
lista.innerHTML="";
let data=JSON.parse(localStorage.getItem("loans")||"[]");
let hoje=new Date();

data.forEach((l,i)=>{
 let venc=new Date(l.data);
 venc.setMonth(venc.getMonth()+1);
 let diff=(venc-hoje)/(1000*60*60*24);
 let aviso = diff<=1 ? "<b style='color:red'>Vence em 1 dia!</b>" : "";
 lista.innerHTML+=`<div class='item'><b>${l.nome}</b><br>Valor: R$ ${l.valor}<br>Juros: ${l.juros}%<br>${aviso}</div>`;
});
}

document.getElementById("loanForm").onsubmit = e=>{
 e.preventDefault();
 let obj={
  nome: nome.value,
  data: data.value,
  valor: parseFloat(valor.value),
  juros: parseFloat(juros.value)
 };
 let arr=JSON.parse(localStorage.getItem("loans")||"[]");
 arr.push(obj);
 localStorage.setItem("loans",JSON.stringify(arr));
 load();
};

load();
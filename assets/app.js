
const DATA = window.RECRUITMENT_DATA || [];
const COLORS = ["#2563eb","#7c3aed","#0f766e","#d97706","#dc2626","#475467","#0891b2","#16a34a"];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function unique(key){return [...new Set(DATA.map(d=>d[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'))}
function fill(id,key){const el=$(id); unique(key).forEach(v=>el.insertAdjacentHTML("beforeend",`<option value="${esc(v)}">${esc(v)}</option>`))}
function initFilters(){
  fill("#fArea","Área"); fill("#fResult","Resultado"); fill("#fModel","Modelo"); fill("#fChannel","Onde encontrou"); fill("#fSalary","Salário"); fill("#fMonth","Mês da candidatura");
  $$("#fArea,#fResult,#fModel,#fChannel,#fSalary,#fMonth,#fCargo").forEach(e=>e.addEventListener("input",renderAll));
  $("#clear").onclick=()=>{$$("#fArea,#fResult,#fModel,#fChannel,#fSalary,#fMonth").forEach(e=>e.value="");$("#fCargo").value="";renderAll()}
}
function filtered(){
  const vals={area:$("#fArea").value,result:$("#fResult").value,model:$("#fModel").value,channel:$("#fChannel").value,salary:$("#fSalary").value,month:$("#fMonth").value,cargo:$("#fCargo").value.toLowerCase().trim()};
  return DATA.filter(d=>
    (!vals.area||d["Área"]===vals.area)&&(!vals.result||d["Resultado"]===vals.result)&&
    (!vals.model||d["Modelo"]===vals.model)&&(!vals.channel||d["Onde encontrou"]===vals.channel)&&
    (!vals.salary||d["Salário"]===vals.salary)&&(!vals.month||d["Mês da candidatura"]===vals.month)&&
    (!vals.cargo||String(d["Cargo"]).toLowerCase().includes(vals.cargo))
  );
}
const count=(arr,key,val)=>arr.filter(d=>d[key]===val).length;
function pct(a,b){return b?((a/b)*100).toFixed(1)+"%":"0.0%"}
function kpi(label,value){return `<div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div></div>`}
function renderKPIs(){
 const d=filtered(), total=d.length, interviews=d.filter(x=>+x["Nº de entrevistas"]>0).length, gestor=count(d,"Entrevista gestor","Sim");
 const tests=d.filter(x=>["Teste","Teste prático","Teste/Case"].includes(x["Etapa máxima"])).length;
 $("#kpis").innerHTML=[
  kpi("Total de processos",total),kpi("Com entrevista",interviews),kpi("Chegaram ao gestor",gestor),
  kpi("Teste ou case",tests),kpi("Aguardando",count(d,"Resultado","Aguardando")),kpi("Reprovados",count(d,"Resultado","Reprovada")),
  kpi("Congelados",count(d,"Resultado","Congelado")),kpi("Aprovados",count(d,"Resultado","Aprovada"))
 ].join("");
 $("#conversions").innerHTML=[
  ["Candidatura → entrevista",pct(interviews,total)],
  ["Entrevista → gestor",pct(gestor,interviews)],
  ["Taxa de aprovação",pct(count(d,"Resultado","Aprovada"),total)],
  ["Taxa de reprovação",pct(count(d,"Resultado","Reprovada"),total)]
 ].map(x=>`<div class="card conv"><div class="v">${x[1]}</div><div class="l">${x[0]}</div></div>`).join("");
}
function group(arr,key){
 const m={}; arr.forEach(d=>{const v=d[key]||"Não informado";m[v]=(m[v]||0)+1}); return Object.entries(m).sort((a,b)=>b[1]-a[1]);
}
function tooltip(html,x,y){const t=$("#tip");t.innerHTML=html;t.style.display="block";t.style.left=(x+14)+"px";t.style.top=(y+14)+"px"}
function hideTip(){$("#tip").style.display="none"}
function setupSvg(w,h){return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><g class="plot"></g></svg>`}
function bars(container,items,title,subtitle){
 const el=$(container), W=900,H=250,left=125,right=25,top=10,bottom=32, pw=W-left-right, ph=H-top-bottom, max=Math.max(...items.map(x=>x[1]),1);
 let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
 items.forEach((it,i)=>{const y=top+i*(ph/items.length)+4,bw=(it[1]/max)*pw;svg+=`<text x="${left-9}" y="${y+16}" text-anchor="end" font-size="12" fill="#667085">${esc(it[0])}</text><rect x="${left}" y="${y}" width="${bw}" height="23" rx="7" fill="${COLORS[i%COLORS.length]}" opacity=".9" data-tip="${esc(it[0])} — ${it[1]} processo(s)"></rect><text x="${left+bw+7}" y="${y+16}" font-size="12" font-weight="700" fill="#182230">${it[1]}</text>`});
 svg+=`</svg>`;el.innerHTML=svg;
 el.querySelectorAll("[data-tip]").forEach(n=>{n.onmousemove=e=>tooltip(n.dataset.tip,e.clientX,e.clientY);n.onmouseleave=hideTip})
}
function stacked(container,arr,key,results){

const cats=group(arr,key).map(x=>x[0]);

const el=$(container),
W=900,
H=250,
L=55,
R=15,
T=15,
B=45,
pw=W-L-R,
ph=H-T-B;

const totals=cats.map(c =>
    results.reduce(
        (s,r) =>
            s + arr.filter(
                d => d[key]===c && d["Resultado"]===r
            ).length,
        0
    )
);

const maxT=Math.max(...totals,1);
const gap=pw/cats.length;
const bw=Math.min(80,gap*.62);

let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;

cats.forEach((c,i)=>{

    let x=L+i*gap+(gap-bw)/2;
    let y=H-B;

    results.forEach((r,j)=>{

        const n=arr.filter(
            d => d[key]===c && d["Resultado"]===r
        ).length;

        if(n){

            const seg=(n/maxT)*ph;

            y-=seg;

            svg+=`
                <rect
                    x="${x}"
                    y="${y}"
                    width="${bw}"
                    height="${seg}"
                    fill="${COLORS[j%COLORS.length]}"
                    data-tip="${esc(c)}<br>${esc(r)}: ${n} (${pct(n,totals[i])})">
                </rect>
            `;
        }

    });

    svg+=`
        <text
            x="${x+bw/2}"
            y="${H-22}"
            text-anchor="middle"
            font-size="11"
            fill="#667085">
            ${esc(c).slice(0,14)}
        </text>
    `;

});

svg+=`
    <line
        x1="${L}"
        y1="${H-B}"
        x2="${W-R}"
        y2="${H-B}"
        stroke="#e7eaf0"/>
</svg>`;

el.innerHTML=svg;

el.querySelectorAll("[data-tip]").forEach(n=>{
    n.onmousemove=e=>tooltip(
        n.dataset.tip,
        e.clientX,
        e.clientY
    );

    n.onmouseleave=hideTip;
});

$(container)
    .parentElement
    .querySelector(".legend")
    .innerHTML=results.map(
        (r,i)=>
            `<span>
                <i class="dot"
                   style="background:${COLORS[i%COLORS.length]}">
                </i>
                ${esc(r)}
            </span>`
    ).join("");

}
function lineChart(container,arr){
 const months=group(arr,"Mês da candidatura").map(x=>x[0]).sort(), W=900,H=250,L=55,R=25,T=20,B=45,pw=W-L-R,ph=H-T-B,max=Math.max(...months.map(m=>count(arr,"Mês da candidatura",m)),1);
 let pts=months.map((m,i)=>[L+(months.length===1?pw/2:i*pw/(months.length-1)),H-B-(count(arr,"Mês da candidatura",m)/max)*ph]);
 let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="#e7eaf0"/>`;
 pts.forEach((p,i)=>{svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${COLORS[0]}" data-tip="${months[i]}: ${count(arr,"Mês da candidatura",months[i])} processo(s)"></circle><text x="${p[0]}" y="${H-20}" text-anchor="middle" font-size="11" fill="#667085">${months[i]}</text>`; if(i)svg+=`<line x1="${pts[i-1][0]}" y1="${pts[i-1][1]}" x2="${p[0]}" y2="${p[1]}" stroke="${COLORS[0]}" stroke-width="3"/>`});svg+=`</svg>`;$(container).innerHTML=svg;
 $(container).querySelectorAll("[data-tip]").forEach(n=>{n.onmousemove=e=>tooltip(n.dataset.tip,e.clientX,e.clientY);n.onmouseleave=hideTip})
}
function renderCharts(){
 const d=filtered(), results=[...new Set(DATA.map(x=>x["Resultado"]).filter(Boolean))];
 bars("#cStages",[["Candidaturas",d.length],["Entrevistas",d.filter(x=>+x["Nº de entrevistas"]>0).length],["Gestor",count(d,"Entrevista gestor","Sim")],["Teste/Case",d.filter(x=>["Teste","Teste prático","Teste/Case"].includes(x["Etapa máxima"])).length],["Aprovações",count(d,"Resultado","Aprovada")]],"","");
 stacked("#cArea",d,"Área",results); stacked("#cModel",d,"Modelo",results); lineChart("#cMonth",d);
 bars("#cMotives",group(d,"Categoria do motivo"),"","");
 stacked("#cChannel",d,"Onde encontrou",results); stacked("#cSalary",d,"Salário",results); stacked("#cStageMax",d,"Etapa máxima",results);
 const noReturn=count(d,"Categoria do motivo","Sem retorno"), bi=count(d,"Área","BI"), li=count(d,"Onde encontrou","LinkedIn");
 $("#insights").innerHTML=[
  ["Sem retorno",`${noReturn} processo(s)`],["Área BI",`${bi} processo(s)`],["LinkedIn",`${li} processo(s)`]
 ].map(x=>`<div class="card insight"><div class="small">${x[0]}</div><div class="big">${x[1]}</div></div>`).join("");
 $("#conclusion").innerHTML=`<div class="tag">PRINCIPAL GARGALO</div><p>${noReturn} dos ${d.length} processos (${pct(noReturn,d.length)}) estão classificados como sem retorno das empresas.</p>`;
}
function renderTable(){
 const d=filtered(), cols=["Empresa","Cargo","Mês da candidatura","Onde encontrou","Área","Salário","Modelo","Entrevista RH","Entrevista gestor","Nº de entrevistas","Etapa máxima","Resultado","Categoria do motivo","Feedback recebido"];
 $("#rows").innerHTML=d.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join("")}</tr>`).join("");
 $("#rowCount").textContent=`${d.length} registro(s)`;
}
function renderAll(){renderKPIs();renderCharts();renderTable()}
function csv(){
 const d=filtered(); if(!d.length)return;
 const cols=Object.keys(d[0]); const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
 const out=[cols.map(q).join(";"),...d.map(r=>cols.map(c=>q(r[c])).join(";"))].join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+out],{type:"text/csv;charset=utf-8"}));a.download="recruitment_analytics_dados_filtrados.csv";a.click();
}
function nav(){
 $$("#nav button").forEach(b=>b.onclick=()=>{ $$("#nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active"); const id=b.dataset.section; $$(".section").forEach(s=>s.classList.toggle("active",s.id===id)); window.scrollTo({top:0,behavior:"smooth"})})
}
document.addEventListener("DOMContentLoaded",()=>{initFilters();nav();renderAll();$("#csv").onclick=csv;$("#year").textContent=new Date().getFullYear()});

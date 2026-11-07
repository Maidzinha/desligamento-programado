const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const NAMES = { shutdown:'Desligar', restart:'Reiniciar', sleep:'Suspender', hibernate:'Hibernar', logoff:'Sair da conta' };
const QUICK = [['30 minutos',1800],['1 hora',3600],['1 hora e 30 min',5400],['2 horas',7200],['3 horas',10800],['4 horas',14400],['6 horas',21600],['8 horas',28800]];
let st = { target:0, action:null }, cfg = {}, tick;

function toast(t){ const e=$('#toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>e.classList.remove('on'),2600); }
const pad = n => String(n).padStart(2,'0');
const fmt = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`;

// abas
$$('.tab').forEach(b => b.onclick = () => {
  $$('.tab').forEach(x => x.classList.toggle('on', x===b));
  $$('.page').forEach(p => p.classList.toggle('on', p.id==='p-'+b.dataset.tab));
});

// janela
$$('[data-w]').forEach(b => b.onclick = () => api.win(b.dataset.w));

// tempos rápidos
QUICK.forEach(([label,sec]) => {
  const b = document.createElement('button'); b.className='q';
  b.innerHTML = `<svg><use href="#i-clock"/></svg>${label}`;
  b.onclick = () => { setFields(sec); begin(sec); };
  $('#quick').appendChild(b);
});

function setFields(sec){ $('#h').value=Math.floor(sec/3600); $('#m').value=Math.floor(sec%3600/60); $('#s').value=sec%60; }
function clamp(el){ const max=+el.max; let v=parseInt(el.value,10); if(isNaN(v)||v<0) v=0; if(v>max) v=max; el.value=v; }
$$('.spin input').forEach(i => { i.onchange = () => clamp(i); i.onblur = () => clamp(i); });
$$('.ud button').forEach(b => b.onclick = () => { const i=$('#'+b.dataset.s); i.value=(parseInt(i.value,10)||0)+ +b.dataset.d; clamp(i); });

async function begin(sec){
  if (!sec || sec < 1) return toast('Defina um tempo maior que zero.');
  st = await api.start(sec); render();
  toast(`${NAMES[st.action]} programado para daqui a ${fmt(sec)}.`);
}
$('#start').onclick = () => begin((+$('#h').value||0)*3600 + (+$('#m').value||0)*60 + (+$('#s').value||0));
$('#cancel').onclick = async () => { st = await api.cancel(); render(); toast('Programação cancelada.'); };

// opções
$$('.act').forEach(b => b.onclick = async () => { cfg = await api.set({ action:b.dataset.a }); paintOpts(); });
$$('.sw').forEach(b => b.onclick = async () => {
  const k=b.dataset.o; cfg = await api.set({ [k]: !cfg[k] }); paintOpts();
});
function paintOpts(){
  $$('.act').forEach(b => b.classList.toggle('on', b.dataset.a===cfg.action));
  $$('.sw').forEach(b => b.setAttribute('aria-checked', !!cfg[b.dataset.o]));
}

// status
function render(){
  clearInterval(tick);
  const t = $('#stText'), c = $('#cancel');
  if (!st.target){ t.textContent='Nenhum desligamento programado.'; c.disabled=true; return; }
  c.disabled = false;
  const at = new Date(st.target).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const paint = () => {
    const left = Math.max(0, Math.round((st.target - Date.now())/1000));
    t.innerHTML = `${NAMES[st.action]} em <b>${fmt(left)}</b> (às ${at})`;
    if (left<=0){ clearInterval(tick); setTimeout(async()=>{ st=(await api.get()).status; render(); },1500); }
  };
  paint(); tick = setInterval(paint, 500);
}

api.onStatus(s => { st = s; render(); });
(async () => {
  const d = await api.get(); cfg = d.cfg; st = d.status;
  $('#ver').textContent = 'v' + d.version; paintOpts(); render();
})();

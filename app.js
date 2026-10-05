const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const defaults={machine:'',crop:'',customer:'',hc:'ON',condition:'Normal',symptoms:[],sample:'Clean',tailings:'Not checked',
setup:{rotor:'',concave:'',vanes:'',fan:'',presieve:'',upper:'',lower:'',speed:'',load:''},pan:{density:'',yield:'',cut:'',discharge:'',speed:'',area:'',grams:'',main:'Not sure',notes:''},saved:[]};
let S=JSON.parse(localStorage.getItem('optimizerPro')||'null')||defaults,page='home';
const machines=['8230','8240','8250','9230','9240','9250','AF9','AF10','AF11'];
const crops=['Canola','Wheat','Barley','Oats','Peas','Lentils','Flax','Soybeans','Corn','Other'];
const densities={Canola:50,Wheat:60,Barley:48,Oats:34,Peas:60,Lentils:60,Flax:56,Soybeans:60,Corn:56};
const symptoms=['Unthreshed grain / heads / pods','Rotor loss / free grain in straw','Sieve loss / free grain in chaff','Cracked / broken grain','Dirty sample / MOG','Stalks / straw in grain tank','High tailings','Grain blowing out','Poor capacity','Plugging / overloading','Uneven / hill loss','Harvest Command hunting'];
function save(){localStorage.setItem('optimizerPro',JSON.stringify(S)); status()}
function status(){$('#status').textContent=`${S.machine||'No machine'} • ${S.crop||'No crop'}${S.customer?' • '+S.customer:''}`}
function card(t,b){return `<section class="card"><h2>${t}</h2>${b}</section>`}
function sel(label,key,arr,obj=S){return `<label>${label}</label><select data-key="${key}">${arr.map(x=>`<option ${obj[key]===x?'selected':''}>${x}</option>`).join('')}</select>`}
function inp(label,key,obj=S,type='text'){return `<label>${label}</label><input type="${type}" data-key="${key}" value="${obj[key]??''}">`}
function bind(obj=S){$$('[data-key]').forEach(e=>e.onchange=()=>{obj[e.dataset.key]=e.value;save();if(page==='simulator'||page==='recommend'||page==='pans')render()})}
function home(){
 const body=inp('Customer','customer')+sel('Machine','machine',['',...machines])+sel('Crop','crop',['',...crops])+sel('Harvest Command','hc',['ON','OFF'])+sel('Crop / field condition','condition',['Normal','Dry / brittle','Tough / damp','Heavy crop','Light crop','Hilly / uneven']);
 app.innerHTML=`<h1>Home</h1>${card('Field Setup',body)}`;
 bind();
}
function diagnose(){
 const checks=symptoms.map(x=>`<label class="check"><input type="checkbox" data-sym="${x}" ${S.symptoms.includes(x)?'checked':''}><span>${x}</span></label>`).join('');
 const body=checks+sel('Grain sample','sample',['Clean','Unthreshed material','Cracked / damaged grain','Dirty / high MOG','Stalks / straw'])+sel('Tailings / returns','tailings',['Not checked','Mostly clean grain','Unthreshed heads / pods','Chaff / MOG','Damaged grain','Sudden high volume']);
 app.innerHTML=`<h1>Diagnose</h1>${card('What are you seeing?',body)}<button class="btn" data-go="recommend">BUILD RECOMMENDATIONS</button>`;
 bind();
 $$('[data-sym]').forEach(e=>e.onchange=()=>{S.symptoms=e.checked?[...new Set([...S.symptoms,e.dataset.sym])]:S.symptoms.filter(x=>x!==e.dataset.sym);save()});
}
function pans(){
 if(!S.pan.density&&densities[S.crop])S.pan.density=densities[S.crop];
 const p=S.pan,n=v=>Number(v)||0,area=n(p.area),g=n(p.grams),density=n(p.density),cut=n(p.cut),dis=n(p.discharge);
 let lb=0,bu=0,pct=0;if(area&&g&&density&&cut&&dis){lb=(g/area)*43560/453.59237*(dis/cut);bu=lb/density;pct=n(p.yield)?bu/n(p.yield)*100:0}
 app.innerHTML=`<h1>Drop Pans</h1><div class="note">Enter the actual catch area and collected loss weight. The calculator estimates field loss after correcting discharge width to cut width.</div>
 ${card('Combine Loss Results',`<div class="grid2">${inp('Density / test weight (lb/bu)','density',p,'number')}${inp('Yield (bu/ac)','yield',p,'number')}${inp('Cut width (ft)','cut',p,'number')}${inp('Discharge width (ft)','discharge',p,'number')}${inp('Ground speed (mph)','speed',p,'number')}${inp('Catch area (ft²)','area',p,'number')}${inp('Loss weight (grams)','grams',p,'number')}</div><div class="result"><div><b>${bu.toFixed(2)}</b><small>bu/ac loss</small></div><div><b>${pct.toFixed(2)}%</b><small>yield loss</small></div><div><b>${lb.toFixed(1)}</b><small>lb/ac</small></div></div>`)}
 ${card('Physical Classification',`${sel('Main physical loss location','main',['Not sure','Header','Rotor / separation','Cleaning system','No significant physical loss'],p)}<label>Notes</label><textarea data-key="notes">${p.notes||''}</textarea><button class="btn" data-go="recommend">BUILD FINAL RECOMMENDATIONS</button>`)}`;bind(p)
}
function currentSettings(){return `${inp('Rotor RPM','rotor',S.setup,'number')}${inp('Concave clearance','concave',S.setup,'number')}${sel('Cage vane position / retention','vanes',['','Faster crop travel','Middle / baseline','More retention'],S.setup)}${inp('Fan RPM','fan',S.setup,'number')}${inp('Pre-sieve opening','presieve',S.setup,'number')}${inp('Upper sieve opening','upper',S.setup,'number')}${inp('Lower sieve opening','lower',S.setup,'number')}${inp('Ground speed (mph)','speed',S.setup,'number')}${inp('Engine load (%)','load',S.setup,'number')}`}
function simulator(){
 const s=S.setup,n=v=>Number(v)||0,main=S.pan.main,hotRotor=main==='Rotor / separation'||n(s.load)>=90,hotShoe=main==='Cleaning system';
 app.innerHTML=`<h1>X-Ray Simulator</h1><div class="note"><b>Diagnostic teaching model:</b> not a physics simulation. It visualizes general crop flow and shows why settings affect threshing, separation and cleaning.</div>
 ${card(`${S.machine||'Combine'} • ${S.crop||'Crop'}`,`<div class="legend"><span class="grain">● GRAIN</span><span class="straw">● STRAW</span><span class="chaff">● CHAFF / MOG</span></div><div class="xray">
 <button class="flow" data-part="feed"><b>1 HEADER → FEEDER</b><small>Cut and deliver the crop mat.</small><div class="stream"><span class="grain">•• grain</span><span class="straw">━━━━ straw</span></div></button><div class="arrow">↓</div>
 <button class="flow ${hotRotor?'hot':''}" data-part="rotor"><b>2 ROTOR + CONCAVES</b><small>Thresh grain from heads / pods.</small><div class="stream"><span class="grain">•••• ↓</span><span class="straw">━━━━ →</span></div></button><div class="arrow">↓</div>
 <button class="flow ${main==='Rotor / separation'?'hot':''}" data-part="sep"><b>3 SEPARATION</b><small>Free grain falls away while straw travels rearward.</small><div class="stream"><span class="grain">••• ↓ SHOE</span><span class="straw">━━━━ → RESIDUE</span></div></button><div class="arrow">↓</div>
 <button class="flow ${hotShoe?'hot':''}" data-part="shoe"><b>4 PRE-SIEVE + CLEANING SHOE</b><small>Airflow and sieves separate grain from MOG.</small><div class="stream"><span class="grain">•••• ↓ CLEAN GRAIN</span><span class="chaff">≈≈≈ → RESIDUE</span></div></button><div class="arrow">↓</div>
 <button class="flow" data-part="tank"><b>5 CLEAN GRAIN → TANK</b><small>Tailings return material that needs another pass.</small></button></div><div id="explain" class="info"><b>Tap a section above.</b></div>`)}
 ${card('Settings Simulator',`<div class="grid2">${currentSettings()}</div><div class="note">Change a setting and the values are saved for your diagnosis. The explanation below teaches the expected direction of effect rather than claiming an exact kernel-by-kernel prediction.</div>`)}
 ${card('Quick Rule',`<span class="badge">ATTACHED GRAIN = THRESHING</span><span class="badge">LOOSE GRAIN + STRAW = SEPARATION</span><span class="badge">LOOSE GRAIN + CHAFF = CLEANING</span>`)}`;
 bind(S.setup);const txt={feed:'<b>Header + Feeder</b><br>A smooth, even crop mat gives the threshing system a consistent load. Header loss must be separated from combine loss before adjusting the machine.',rotor:'<b>Rotor + Concaves</b><br>Higher rotor speed and tighter concave clearance generally increase threshing action. Excess aggression can damage grain and break crop material into extra MOG.',sep:'<b>Separation</b><br>Once grain is free, it still has to leave the straw mat. Retention time, crop load, rotor behavior and separation configuration matter. Loose grain in straw points here.',shoe:'<b>Cleaning Shoe</b><br>The pre-sieve, upper sieve, lower sieve and fan work as a system. Air removes light MOG while openings let grain pass. Determine overload versus blow-out before changing fan or sieves.',tank:'<b>Clean Grain + Tailings</b><br>The grain tank shows final sample quality. Tailings contents tell you whether the problem is restriction, incomplete threshing, excess MOG or reprocessing.'};$$('[data-part]').forEach(b=>b.onclick=()=>$('#explain').innerHTML=txt[b.dataset.part])
}
function recommendations(){
 let r=[];
 const has=x=>S.symptoms.includes(x);
 if(has('Unthreshed grain / heads / pods')||S.sample==='Unthreshed material'||S.tailings==='Unthreshed heads / pods')r.push(['THRESHING','Verify grain is still attached. Test more effective threshing with rotor speed and/or concave clearance. Make one change, then physically verify.']);
 if(has('Rotor loss / free grain in straw')||S.pan.main==='Rotor / separation')r.push(['SEPARATION','Loose grain with straw points to separation. Check crop load and separation opportunity; test rotor/cage-vane strategy from the current baseline and verify with pans.']);
 if(has('Sieve loss / free grain in chaff')||has('Grain blowing out')||S.pan.main==='Cleaning system')r.push(['CLEANING','Loose grain with chaff points to the cleaning system. Determine whether the shoe is overloaded or airflow is carrying grain out before changing fan or sieve openings.']);
 if(has('Cracked / broken grain')||S.sample==='Cracked / damaged grain')r.push(['GRAIN DAMAGE','Reduce unnecessary threshing/rethreshing. Check rotor aggression, concave clearance and whether clean grain is being recirculated in tailings.']);
 if(has('Dirty sample / MOG')||S.sample==='Dirty / high MOG')r.push(['DIRTY SAMPLE','Identify whether MOG is being created upstream by aggressive threshing or not removed by the cleaning system. Do not automatically close sieves first.']);
 if(S.tailings==='Mostly clean grain')r.push(['TAILINGS','Mostly clean grain in returns can indicate cleaning restriction. Check sieve openings and loading before increasing threshing aggression.']);
 if(!r.length)r.push(['VERIFY FIRST','Physically classify the problem: attached grain = threshing, loose grain with straw = separation, loose grain with chaff = cleaning. Then make one change and recheck.']);
 app.innerHTML=`<h1>Recommendations</h1><div class="note"><b>One change at a time.</b> Confirm the physical loss location before chasing monitor numbers.</div>${card('Ranked Diagnostic Direction',r.map((x,i)=>`<div class="rec"><h3>${i+1}. ${x[0]}</h3><p>${x[1]}</p></div>`).join(''))}<button class="btn" id="saveSetup">SAVE THIS SETUP</button>`;
 $('#saveSetup').onclick=()=>{S.saved.unshift({date:new Date().toLocaleDateString(),machine:S.machine,crop:S.crop,customer:S.customer,setup:{...S.setup},note:r[0][0]});S.saved=S.saved.slice(0,30);save();alert('Setup saved')}
}
function setups(){app.innerHTML=`<h1>Saved Setups</h1>${S.saved.length?S.saved.map(x=>card(`${x.machine||'Machine'} • ${x.crop||'Crop'}`,`<b>${x.customer||'No customer'}</b><div class="muted">${x.date} • ${x.note}</div><p>Rotor ${x.setup.rotor||'—'} • Concave ${x.setup.concave||'—'} • Fan ${x.setup.fan||'—'} • Pre-sieve ${x.setup.presieve||'—'} • Upper ${x.setup.upper||'—'} • Lower ${x.setup.lower||'—'}</p>`)).join(''):card('No saved setups','Save a setup from the Recommendations tab after you have verified it in the field.')}`}
const pages={home,diagnose,pans,simulator,recommend:recommendations,setups};
function render(){pages[page]();status();$$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$$('[data-go]').forEach(b=>b.onclick=()=>{page=b.dataset.go;render()})}
$$('#nav button').forEach(b=>b.onclick=()=>{page=b.dataset.page;render()});
window.addEventListener('online',offline);window.addEventListener('offline',offline);
function offline(){const e=$('#offlineStatus');e.textContent=navigator.onLine?'OFFLINE READY ✓':'OFFLINE MODE ✓';e.style.background=navigator.onLine?'#286c37':'#7a1d1d'}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').then(()=>offline()).catch(()=>{$('#offlineStatus').textContent='OFFLINE CACHE ERROR'});
render();offline();

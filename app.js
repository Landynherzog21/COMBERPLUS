const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const defaults={machine:'',crop:'',customer:'',hc:'ON',condition:'Normal',symptoms:[],sample:'Clean',tailings:'Not checked',
setup:{rotor:'500',concave:'20',vanes:'Middle / baseline',fan:'950',presieve:'5',upper:'12',lower:'8',speed:'4.0',load:'75'},diagnosticResult:null,pan:{density:'',yield:'',cut:'',discharge:'',speed:'',area:'',grams:'',main:'Not sure',notes:''},saved:[]};
let S=JSON.parse(localStorage.getItem('optimizerPro')||'null')||defaults,page='home';
const app=document.getElementById('app');
S.setup={...defaults.setup,...(S.setup||{})};
const machines=['8230','8240','8250','9230','9240','9250','AF9','AF10','AF11'];
const crops=['Canola','Wheat','Barley','Oats','Peas','Lentils','Flax','Soybeans','Corn','Other'];
const densities={Canola:50,Wheat:60,Barley:48,Oats:34,Peas:60,Lentils:60,Flax:56,Soybeans:60,Corn:56};
const symptoms=['Unthreshed grain / heads / pods','Rotor loss / free grain in straw','Sieve loss / free grain in chaff','Cracked / broken grain','Dirty sample / MOG','Stalks / straw in grain tank','High tailings','Grain blowing out','Poor capacity','Plugging / overloading','Uneven / hill loss','Harvest Command hunting'];
function save(){localStorage.setItem('optimizerPro',JSON.stringify(S));status()}
function status(){$('#status').textContent=`${S.machine||'No machine'} • ${S.crop||'No crop'}${S.customer?' • '+S.customer:''}`}
function card(t,b){return `<section class="card"><h2>${t}</h2>${b}</section>`}
function sel(label,key,arr,obj=S){return `<label>${label}</label><select data-key="${key}">${arr.map(x=>`<option ${obj[key]===x?'selected':''}>${x}</option>`).join('')}</select>`}
function inp(label,key,obj=S,type='text'){return `<label>${label}</label><input type="${type}" data-key="${key}" value="${obj[key]??''}">`}
function bind(obj=S){$$('[data-key]').forEach(e=>e.onchange=()=>{obj[e.dataset.key]=e.value;save();if(page==='information'||page==='recommend'||page==='pans')render()})}
function home(){const body=inp('Customer','customer')+sel('Machine','machine',['',...machines])+sel('Crop','crop',['',...crops])+sel('Harvest Command','hc',['ON','OFF'])+sel('Crop / field condition','condition',['Normal','Dry / brittle','Tough / damp','Heavy crop','Light crop','Hilly / uneven']);app.innerHTML=`<h1>Home</h1>${card('Field Setup',body)}`;bind()}
const diagnosticAreas={
 Feeding:['Feeder speed','Ground speed'],
 Threshing:['Rotor speed','Concave clearance'],
 Separation:['Rotor speed','Cage vane position'],
 Cleaning:['Fan speed','Pre-sieve','Upper sieve','Lower sieve'],
 Residue:['Chopper speed','Stationary knife position','Spreader speed']
};
function diagnose(){
 const areaButtons=Object.keys(diagnosticAreas).map(x=>`<button class="btn areaBtn" data-area="${x}">${x.toUpperCase()}</button>`).join('');
 const checks=symptoms.map(x=>`<label class="check"><input type="checkbox" data-sym="${x}" ${S.symptoms.includes(x)?'checked':''}><span>${x}</span></label>`).join('');
 const body=checks+sel('Grain sample','sample',['Clean','Unthreshed material','Cracked / damaged grain','Dirty / high MOG','Stalks / straw'])+sel('Tailings / returns','tailings',['Not checked','Mostly clean grain','Unthreshed heads / pods','Chaff / MOG','Damaged grain','Sudden high volume']);
 app.innerHTML=`<h1>Diagnose</h1>${card('1. Select Issue Area',`<div class="grid2">${areaButtons}</div>`)}${card('Or describe what you are seeing',body)}<button class="btn" data-go="recommend">BUILD RECOMMENDATIONS</button>`;
 bind();
 $$('.areaBtn').forEach(b=>b.onclick=()=>diagnosticAreaPage(b.dataset.area));
 $$('[data-sym]').forEach(e=>e.onchange=()=>{S.symptoms=e.checked?[...new Set([...S.symptoms,e.dataset.sym])]:S.symptoms.filter(x=>x!==e.dataset.sym);save()});
}
function diagnosticAreaPage(area){
 const settings=diagnosticAreas[area]||[];
 const rows=settings.map((name,i)=>`<section class="card diagSetting" data-setting="${name}"><h3>${name}</h3><div class="grid2"><label>Min Range</label><input type="number" step="any" data-f="min"><label>Max Range</label><input type="number" step="any" data-f="max"><label>Sensitivity (%)</label><input type="number" step="any" data-f="sens"><label>Current Position</label><input type="number" step="any" data-f="actual"></div></section>`).join('');
 app.innerHTML=`<h1>${area} Diagnostic</h1><div class="note">Enter the current machine data. COMBERPLUS will compare the settings and choose what to adjust first.</div>${rows}<button class="btn" id="areaCalc">MAKE RECOMMENDATION</button><button class="btn secondary" id="areaBack">BACK TO DIAGNOSE</button>`;
 $('#areaBack').onclick=diagnose;
 $('#areaCalc').onclick=()=>runAreaDiagnostic(area);
}
function runAreaDiagnostic(area){
 const data=[];let bad=false;
 $$('.diagSetting').forEach(row=>{
  const get=f=>Number(row.querySelector('[data-f="'+f+'"]').value);
  const min=get('min'),max=get('max'),sens=get('sens'),actual=get('actual'),name=row.dataset.setting;
  if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min||!Number.isFinite(sens)||!Number.isFinite(actual)){bad=true;return}
  data.push({name,min,max,sens,actual,pos:Math.max(0,Math.min(100,(actual-min)/(max-min)*100))});
 });
 if(bad||!data.length){alert('Fill in Min Range, Max Range, Sensitivity and Current Position for every setting. Max Range must be greater than Min Range.');return}
 showAreaRecommendation(area,data);
}
function showAreaRecommendation(area,data){
 const issue={Feeding:'FEEDING',Threshing:'THRESHING',Separation:'SEPARATION',Cleaning:'CLEANING',Residue:'RESIDUE'}[area]||area.toUpperCase();
 const scored=data.map(x=>{const middle=1-Math.abs(50-x.pos)/50;const sensRoom=Math.max(0,100-x.sens)/100;return {...x,score:middle*.75+sensRoom*.25}}).sort((a,b)=>b.score-a.score);
 const best=scored[0],second=scored[1],span=best.max-best.min;
 let direction=1,word='increase';
 if(area==='Threshing'&&best.name==='Concave clearance'){direction=-1;word='tighten'}
 if(area==='Cleaning'&&(best.name==='Pre-sieve'||best.name==='Upper sieve'||best.name==='Lower sieve')){direction=-1;word='close slightly'}
 const target=Math.max(best.min,Math.min(best.max,best.actual+span*.07*direction));
 const newSens=Math.min(100,best.sens+10);
 S.diagnosticResult={area,issue,data,best,second,target:Number(target.toFixed(1)),newSens,word,date:new Date().toLocaleString()};
 save();page='recommend';render();
}
function pans(){if(!S.pan.density&&densities[S.crop])S.pan.density=densities[S.crop];const p=S.pan,n=v=>Number(v)||0,area=n(p.area),g=n(p.grams),density=n(p.density),cut=n(p.cut),dis=n(p.discharge);let lb=0,bu=0,pct=0;if(area&&g&&density&&cut&&dis){lb=(g/area)*43560/453.59237*(dis/cut);bu=lb/density;pct=n(p.yield)?bu/n(p.yield)*100:0}app.innerHTML=`<h1>Drop Pans</h1><div class="note">Enter the actual catch area and collected loss weight. The calculator estimates field loss after correcting discharge width to cut width.</div>${card('Combine Loss Results',`<div class="grid2">${inp('Density / test weight (lb/bu)','density',p,'number')}${inp('Yield (bu/ac)','yield',p,'number')}${inp('Cut width (ft)','cut',p,'number')}${inp('Discharge width (ft)','discharge',p,'number')}${inp('Ground speed (mph)','speed',p,'number')}${inp('Catch area (ft²)','area',p,'number')}${inp('Loss weight (grams)','grams',p,'number')}</div><div class="result"><div><b>${bu.toFixed(2)}</b><small>bu/ac loss</small></div><div><b>${pct.toFixed(2)}%</b><small>yield loss</small></div><div><b>${lb.toFixed(1)}</b><small>lb/ac</small></div></div>`)}${card('Physical Classification',`${sel('Main physical loss location','main',['Not sure','Header','Rotor / separation','Cleaning system','No significant physical loss'],p)}<label>Notes</label><textarea data-key="notes">${p.notes||''}</textarea><button class="btn" data-go="recommend">BUILD FINAL RECOMMENDATIONS</button>`)}`;bind(p)}
function currentSettings(){return `${inp('Rotor RPM','rotor',S.setup,'number')}${inp('Concave clearance','concave',S.setup,'number')}${sel('Cage vane position / retention','vanes',['Faster crop travel','Middle / baseline','More retention'],S.setup)}${inp('Fan RPM','fan',S.setup,'number')}${inp('Pre-sieve opening','presieve',S.setup,'number')}${inp('Upper sieve opening','upper',S.setup,'number')}${inp('Lower sieve opening','lower',S.setup,'number')}${inp('Ground speed (mph)','speed',S.setup,'number')}${inp('Engine load (%)','load',S.setup,'number')}`}
function information(){
 const family=(S.machine||'').startsWith('AF')?'AF Series selected — complete reference shown':'8230–9250 selected — complete reference shown';
 const items=[
 ['Feeder faceplate','Mounts the header to the feeder. Its angle affects header geometry and how smoothly crop enters the feeder. Header height, tilt and faceplate setup must be correct before blaming threshing or cleaning.','Both'],
 ['Feeder chain','Uses slats/chains to carry the crop mat rearward from the header into the transition area. Even, continuous feeding is important because bunches create rotor-load spikes and unstable loss.','Both'],
 ['Feeder slats','The crossbars attached to the feeder chain physically grip and move the crop mat. Bent, worn or missing slats can make feeding uneven.','Both'],
 ['Feeder drive','Powers the feeder and header. On equipped machines feedrate/drive control works with machine load; overload protection and reversing help clear plugs.','Both'],
 ['Feeder reverser / deslug function','Reverses crop flow to help remove a feeder or rotor slug instead of forcing more material into the machine. Use only according to the machine procedure.','Both'],
 ['Stone trap / rock protection','Intercepts stones before they reach the threshing system. On AF Series, the Synchronized Feed System also improves rock-catching function and remote stone-trap dumping can be equipped.','Both'],
 ['Synchronized Feed System (SFS)','AF Series system that times feeder-chain delivery with rotor speed so crop transfers smoothly into the transition cone, reducing bunching and grain damage.','AF Series'],
 ['Transition cone','Funnels the wide crop mat from the feeder into the narrower axial rotor path. Wear or damage here changes crop acceleration and can contribute to poor feeding or plugging.','Both'],
 ['Rotor','The main axial threshing/separating element. Crop spirals around it; threshing occurs mainly as crop is rubbed against concaves, then centrifugal force helps separated grain move through concaves/grates. 8230–9250 use the established single-rotor layout; AF9/AF10 use the longer AFXL single rotor while AF11 uses AFXL2 dual rotors.','Both'],
 ['Rotor rasp bars','Raised rotor elements that engage, accelerate and rub crop. Their type, position and wear affect threshing aggression, crop movement, grain damage and separation.','Both'],
 ['Spiked rasp / separation bars','More aggressive rotor elements used where additional crop agitation/separation is required. They are not the same job as the standard threshing rasp bars.','Both'],
 ['HX rasp bars','AF AFXL rotor elements in the transition between threshing and separation; Case IH describes them as combining spiked-bar height with a standard-bar profile to accelerate crop flow between zones.','AF Series'],
 ['Rotor speed','Changes rotor tip speed and crop agitation. More speed can improve threshing but can increase damage or break MOG; less speed can protect grain but may reduce threshing/separation. Diagnose the physical loss before changing it.','Both'],
 ['Concaves','Curved grates directly under/around the threshing section of the rotor. They provide the opposing surface for threshing and openings for released grain to leave the crop mat. Concave type must suit crop/conditions.','Both'],
 ['Concave clearance','Gap between rotor and concaves. Tighter generally increases rubbing/threshing; wider reduces aggression. It is a separate adjustment from rotor speed.','Both'],
 ['Separating grates','Grated area after the main threshing concaves. Their job is primarily to give already-loose grain more opportunity to leave the straw mat before residue exits the rotor.','Both'],
 ['Rotor cage','Stationary structure surrounding the rotor that contains and guides the crop mat through the axial path.','Both'],
 ['Rotor cage vanes','Guide crop rearward through the rotor cage. More retention increases time/opportunity in the rotor; a faster crop-travel position moves material rearward sooner. Harvest Command can control vane angle on equipped machines.','Both'],
 ['Active grain pan','Receives grain and MOG that have passed through concaves/grates and uses reciprocating motion to begin stratifying/separating the material before final cleaning.','8230–9250'],
 ['Grain-pan sidehill distribution','On AF Series the cleaning architecture includes active cross-distribution control at the grain pan so material is kept more evenly distributed on slopes.','AF Series'],
 ['Pre-sieve','First adjustable cleaning opening encountered by material entering the shoe on 250-series architecture. It can let readily clean grain fall toward the lower sieve early, reducing upper-sieve load. Too closed restricts capacity; too open can pass excess MOG.','8230–9250'],
 ['Upper front sieve','AF Series Harvest Command controls the front portion independently. It is an individual cleaning element and is not the same adjustment as the rear upper sieve.','AF Series'],
 ['Upper rear sieve','Rear section of the AF upper cleaning area. Independent control lets the machine match opening to material condition and load through the rear of the shoe.','AF Series'],
 ['Lower front sieve','Front lower-sieve section on AF Series. Clean grain must pass through it while larger unwanted material is retained for further processing/rejection.','AF Series'],
 ['Lower rear sieve','Rear lower-sieve section on AF Series. It is separately controlled from the front lower section by Harvest Command.','AF Series'],
 ['Upper sieve / chaffer','On 8230–9250, the upper adjustable sieve carries the bulk of the crop mat while air lifts light MOG. Grain falls through its openings. Closing it too far can restrict capacity and increase returns/loss.','8230–9250'],
 ['Lower sieve / shoe sieve','Final adjustable cleaning stage on 8230–9250. Clean grain passes through toward the clean-grain auger while larger material is directed toward the returns path.','8230–9250'],
 ['Cross Flow cleaning fan','Supplies cleaning air across the shoe. Case IH uses top-entry/full-width airflow to create a balanced air stream. Too little air leaves light MOG in the sample; excessive air can carry light grain out.','Both'],
 ['Cross Flow Plus cleaning fan','AF Series hydraulically driven fan is larger and designed for high uniform airflow at lower overall fan speeds than the prior architecture.','AF Series'],
 ['Cleaning side shake','AF Series Harvest Command can alter Cross-Flow Plus side-shake/cross-distribution action to keep the shoe loaded evenly as terrain changes.','AF Series'],
 ['Self-leveling cleaning system','On 250-series machines the cleaning system can compensate for side slopes up to about 12%, keeping material distributed rather than piled on the downhill side.','8230–9250'],
 ['Clean-grain cross auger','Collects grain that has passed through the cleaning sieves and moves it sideways to the clean-grain elevator.','Both'],
 ['Second clean-grain cross auger','AF Series uses two strategically positioned clean-grain cross augers to move the much higher cleaning-system throughput to the elevator.','AF Series'],
 ['Clean-grain elevator','Raises cleaned grain from the bottom of the machine to the grain tank/fill system. AF Series uses molded paddles and an all-belt drive with two capacity speeds.','Both'],
 ['Yield sensor','Measures grain-flow force/mass-flow in the clean-grain path so the display can calculate yield when combined with speed, width and calibration information.','Both'],
 ['Moisture sensor','Samples harvested grain to estimate grain moisture. Moisture affects wet-yield correction and the usefulness of yield mapping.','Both'],
 ['Grain quality camera / imaging','Views grain in the clean-grain stream and evaluates sample quality. Harvest Command uses grain-quality information together with other sensors to optimize settings; AF Series can show grain-quality imaging on Pro 1200.','Both'],
 ['Grain tank fill system','Receives grain from the clean-grain elevator and distributes it into the tank so the machine can continue harvesting between unloads.','Both'],
 ['Grain tank','Stores cleaned grain. Capacity is a storage function, not a cleaning function; grain arriving here should already have passed the cleaning system.','Both'],
 ['Grain-tank cross augers','Move grain at the bottom of the tank toward the unloading system. Their job begins only when unloading is commanded.','Both'],
 ['Vertical unload auger','Raises grain from the tank cross-auger area into the horizontal unloading tube.','Both'],
 ['Horizontal unloading auger','Carries grain outward to the cart/truck. Unload capacity is separate from harvesting throughput, although slow unloading can reduce field efficiency.','Both'],
 ['Pivoting unload spout','Controls the discharge trajectory at the end of equipped unloading augers, helping place grain accurately in a cart.','Both'],
 ['Tailings cross auger','Collects material rejected by the cleaning system that still contains recoverable grain and moves it into the returns/reprocessing system.','8230–9250'],
 ['Tri-Sweep tailings processor','Uses three sets of impellers to gently re-thresh tailings, then returns the processed material to the active grain pan for another cleaning pass. This avoids sending the entire return stream back through the main rotor.','8230–9250'],
 ['Tailings volume / returns sensing','Shows how much material is being recirculated. High returns are a symptom, not a setting: inspect what the returns contain—clean grain, unthreshed material or MOG—before adjusting the machine.','Both'],
 ['Residue discharge from rotor','After useful grain has been separated, the remaining straw leaves the rear of the rotor/cage and enters the residue-management path.','Both'],
 ['Integral straw chopper','Cuts rotor residue before spreading. Chop quality depends on rotor/knife condition, crop moisture, throughput and the selected residue configuration.','8230–9250'],
 ['Rotating chopper knives','High-speed moving knives on the chopper rotor that cut straw as it passes through. Sharpness, damage and balance matter for chop quality and vibration.','8230–9250'],
 ['Stationary knives / counterknives','Fixed knives engaged into the chopper crop stream so rotating knives shear residue against them. More knife engagement generally creates a finer chop but requires more power.','Both'],
 ['Xtra-Chopping system','250-series residue option intended for more intensive residue processing than the integral-chopper arrangement.','8230–9250'],
 ['MagnaCut','AF Series integrated chopper option for standard chopping. Case IH pairs it with disc or advanced horizontal spreading options depending on configuration.','AF Series'],
 ['MagnaChop','AF Series high hood-mounted fine-chop option for heavier straw volumes. It supports remote speed selection, chop/drop selection and remote counterknife engagement on applicable configurations.','AF Series'],
 ['Chaff path','Light material separated by the cleaning system leaves the shoe independently of the straw leaving the rotor, then is directed into the selected residue spreading/windrowing arrangement.','Both'],
 ['Chaff spreader','Spreads cleaning-system chaff across the harvested width instead of concentrating it behind the combine.','8230–9250'],
 ['Simple disc spreaders','AF residue option using rotating discs to distribute processed residue behind the combine.','AF Series'],
 ['Advanced horizontal spreaders','AF residue option designed for wide, controlled residue distribution and compatible with the higher-capacity chopping packages.','AF Series'],
 ['Radar Spread Automation','AF Series radar-based control adjusts residue spreading to maintain a more uniform pattern as wind or slope changes.','AF Series'],
 ['Windrow / swath chute','Routes long straw into a windrow instead of chopping/spreading it when straw is being saved.','Both'],
 ['Harvest Command','Automation system that uses sensors and algorithms to adjust machine settings toward the selected strategy. On 250 Series it controls items including rotor speed, cage vanes, fan, sieves and feedrate; AF Series expands control to nine settings including four individual sieve sections and cleaning side shake.','Both'],
 ['Sieve pressure sensors','Measure cleaning-system loading/pressure so Harvest Command can recognize how hard the shoe is working and react before loss becomes excessive.','Both'],
 ['Rotor loss sensors','Detect impacts associated with grain leaving in the separation/residue area. They are a relative electronic indicator and should be calibrated/verified against physical loss checks.','Both'],
 ['Sieve loss sensors','Detect grain impacts at the rear cleaning-loss area. Their monitor reading is not a direct bu/ac measurement; verify with pans/ground counts.','Both'],
 ['Engine load sensing','Tells automation how heavily the engine is loaded. Harvest Command can use a maximum engine-load target to manage feedrate.','Both'],
 ['Ground speed / feedrate control','Changes how much crop enters per unit time. If physical loss rises only as load increases and improves when slowing, total machine capacity may be the limiting factor.','Both'],
 ['PowerPlus CVT rotor drive','Variable rotor drive used on equipped Case IH combines; it allows controlled rotor-speed changes and, on newer architecture, contributes to powered deslug/reversing functions.','Both'],
 ['Pro 700 / Pro 1200 display','Operator interface for machine settings, automation, loss monitors, yield/moisture information, guidance and diagnostics. Model/year determines which display and functions are available.','Both'],
 ['Harvest loss monitor','Combines calibrated electronic loss-sensor signals into an operator reference. It shows change/trend, not an automatically trustworthy field-loss number; physical checks remain the verification.','Both'],
 ['Cleaning fan inlet','Air-entry area feeding the Cross Flow fan. On the 250/260 architecture air enters across the full width from the top rather than only at the sides, helping create even airflow across the shoe.','8230–9250'],
 ['Cleaning fan rotor / impeller','Rotating fan element that accelerates cleaning air. Fan speed changes the energy available to lift chaff and MOG away from grain.','Both'],
 ['Cleaning fan hydraulic drive','AF Cross Flow Plus uses a hydraulically driven cleaning fan. This lets the machine control fan speed independently as Harvest Command responds to conditions.','AF Series'],
 ['Automatic cleaning-fan control','On equipped 250/260 machines, automatic fan control changes fan RPM to maintain cleaning performance, including compensation when travelling up or down slopes.','8230–9250'],
 ['Pre-sieve slats','Individual adjustable louvers in the pre-sieve. Their opening determines how much grain and material can pass at the first cleaning stage.','8230–9250'],
 ['Pre-sieve actuator','Moves the in-cab adjustable pre-sieve. The commanded position must match the physical opening; linkage or actuator problems can make the displayed setting misleading.','8230–9250'],
 ['Upper sieve slats','Individual chaffer louvers forming the upper sieve. Their opening controls passage area while the air stream works through the crop mat.','8230–9250'],
 ['Upper sieve actuator','Electric actuator that changes the upper-sieve opening on equipped machines. A failed actuator/linkage can leave the physical sieve at a different opening than intended.','8230–9250'],
 ['Lower sieve slats','Individual louvers in the lower sieve. They provide the final adjustable opening before clean grain reaches the clean-grain collection area.','8230–9250'],
 ['Lower sieve actuator','Electric actuator that positions the lower sieve. Always verify physical movement when troubleshooting a setting that does not respond.','8230–9250'],
 ['Upper-front sieve actuator','Harvest Command actuator for the AF upper-front sieve section. It is controlled independently rather than treating the complete upper sieve as one opening.','AF Series'],
 ['Upper-rear sieve actuator','Harvest Command actuator for the AF upper-rear sieve section.','AF Series'],
 ['Lower-front sieve actuator','Harvest Command actuator for the AF lower-front sieve section.','AF Series'],
 ['Lower-rear sieve actuator','Harvest Command actuator for the AF lower-rear sieve section.','AF Series'],
 ['Cleaning shoe frame','Supports the sieve assemblies and transfers the reciprocating/side-shake motion needed to move and stratify material.','Both'],
 ['Cleaning shoe drive','Mechanical/hydraulic drive that produces cleaning-shoe movement. Speed and integrity of this drive matter because a shoe that is not moving correctly cannot clean normally.','Both'],
 ['Cleaning shoe shake-speed sensor','Monitors actual cleaning-shoe movement on machines equipped with this sensing. It helps identify a drive or speed problem rather than a crop-setting problem.','Both'],
 ['Sieve pressure sensor','Measures pressure/loading conditions in the cleaning system for Harvest Command. It helps automation recognize shoe load; it does not replace physical loss verification.','Both'],
 ['Sieve loss sensor','Impact sensor at the rear cleaning-loss area. Grain strikes the sensor and produces a relative loss signal used by the monitor/automation.','Both'],
 ['Rotor loss sensor','Impact sensor associated with separation loss. It indicates changes in grain impacts leaving the separation area, but calibration and physical checks are required.','Both'],
 ['Cleaning shoe side-shake control','AF Harvest Command can automatically change Cross Flow Plus cleaning side shake as one of its nine controlled settings to manage distribution on slopes.','AF Series'],
 ['Active grain-pan drive','Produces the reciprocating movement of the active grain pan so grain and MOG begin separating before reaching the sieves.','8230–9250'],
 ['Grain-pan fingers / surface','Working surface of the grain pan that conveys and stratifies the material falling from the rotor/concaves toward the cleaning shoe.','Both'],
 ['Tailings trough','Collects material rejected from the cleaning shoe before it is moved into the tailings return/reprocessing path.','Both'],
 ['Tailings auger','Moves rejected cleaning material from the tailings trough toward the tailings processor/elevator.','Both'],
 ['Tailings elevator','Raises returns material so it can be reprocessed/reintroduced into the machine. Its load is useful diagnostically because excessive returns often indicate a threshing or cleaning restriction.','Both'],
 ['Tri-Sweep first impeller set','First of the three impeller stages in the 250/260 Tri-Sweep tailings processor; begins gentle re-threshing and movement of returns material.','8230–9250'],
 ['Tri-Sweep second impeller set','Second Tri-Sweep impeller stage continuing re-threshing and conveyance of the returns stream.','8230–9250'],
 ['Tri-Sweep third impeller set','Final Tri-Sweep impeller stage that completes processing/elevation before material is returned to the active grain pan.','8230–9250'],
 ['Tailings return path','Route carrying processed returns back to the cleaning area. On Tri-Sweep machines processed tailings are returned to the active grain pan for final cleaning.','8230–9250'],
 ['Clean-grain auger trough','Housing under the cleaning system in which clean grain is collected and conveyed by the clean-grain cross auger.','Both'],
 ['Clean-grain auger speed sensor','Monitors clean-grain auger speed on equipped machines so a stopped/slipping grain-handling drive can be detected before plugging or grain backup occurs.','Both'],
 ['Clean-grain elevator chain / belt','Conveying element inside the clean-grain elevator. AF uses an all-belt-drive clean-grain elevator system; configuration differs on earlier machines.','Both'],
 ['Clean-grain elevator paddles','Paddles physically carry grain upward. AF Series uses molded paddles designed to move high grain volume with less damage.','Both'],
 ['Clean-grain elevator boot','Bottom housing where clean grain enters the elevator. Grain accumulation or damage here can restrict the entire grain-handling path.','Both'],
 ['Two-speed grain elevator','Allows elevator capacity to be matched to crop flow. AF Series provides 8,000 or 10,000 bu/hr operating capability; 250-series machines can also be equipped with a two-speed high-volume elevator.','Both'],
 ['Grain camera','Camera in the grain handling/elevator system on equipped Harvest Command machines. It provides grain/sample information used for automation and operator verification.','Both'],
 ['Grain-quality imaging processor','Processes grain-camera imagery to evaluate harvested sample quality and feed that information into the Harvest Command strategy.','Both'],
 ['Yield impact / mass-flow sensor','Measures grain flow in the clean-grain path for yield calculation. Correct calibration is required for useful yield data.','Both'],
 ['Yield calibration system','Converts sensor output into field yield. AF Series supports single-point yield calibration; bad calibration affects yield mapping but does not physically change combine loss.','AF Series'],
 ['Moisture-sensor bypass / sampling path','Directs a representative grain sample across the moisture sensor so harvested moisture can be measured continuously.','Both'],
 ['Grain tank covers / extensions','Increase usable tank volume and fold for transport/service. Equipped 250-series high-capacity tanks can use in-cab hydraulic folding covers.','Both'],
 ['Grain-tank left cross auger','One of the augers moving stored grain toward the unload sump. On equipped 250-series machines independent cross-auger control can reduce unload-system load.','8230–9250'],
 ['Grain-tank right cross auger','Second tank cross-auger conveying grain toward the unloading system.','8230–9250'],
 ['Independent cross-auger drive','Dual-drive arrangement allowing grain-tank cross augers to be controlled independently on equipped 250-series machines.','8230–9250'],
 ['Unloading vertical auger gearbox','Transfers drive into the vertical unloading auger that raises grain from the tank sump.','Both'],
 ['Unloading elbow','Joint transferring grain from the vertical unload auger into the horizontal tube while allowing the unloading auger to swing.','Both'],
 ['Unloading auger swing actuator','Hydraulic/electric mechanism that folds or swings the unloading tube between transport and unload positions.','Both'],
 ['Unloading auger position sensor','Reports whether the unloading auger is stowed or extended so machine logic can control unloading and warnings safely.','Both'],
 ['Pivoting unload-spout actuator','Electrically moves the pivoting spout on equipped machines to direct grain into the cart without moving the whole auger.','Both'],
 ['Rotor discharge deflector','Immediately behind the rotor; creates a central residue feeding point and directs material toward the chopper. On 250/260 architecture it can be adjusted through four positions, with in-cab adjustment on equipped packages.','8230–9250'],
 ['Rotor discharge-deflector actuator','Moves the rotor discharge deflector on equipped deluxe residue packages to alter how residue is presented to the chopper/spreader.','8230–9250'],
 ['Chopper rotor','High-speed rotating shaft carrying chopper blades. It supplies the kinetic energy for cutting and moving straw into the spreading system.','Both'],
 ['Chopper blades','Individual moving blades mounted to the chopper rotor. 250/260 chopper blades are arranged in a spiral pattern; package and blade count vary by configuration.','8230–9250'],
 ['Chopper blade mounts','Hardware securing each rotating blade to the chopper rotor. Wear, looseness or damage can affect balance and cutting quality.','Both'],
 ['Counterknife bank','Group of stationary knives positioned against the rotating chopper blades. Engaging the bank increases cutting action and power requirement.','Both'],
 ['Counterknife-bank actuator','Adjusts counterknife engagement on equipped deluxe chopper packages, allowing chop intensity to be changed from the cab.','8230–9250'],
 ['Chopper speed drive','Changes chopper rotor speed. Equipped deluxe packages provide in-cab chopper-speed shift so residue processing can be matched to crop and desired chop.','8230–9250'],
 ['Chop-to-swath door','Changes residue routing between chopping/spreading and windrowing/swathing modes. Equipped systems can change this from the cab.','Both'],
 ['Swath-door actuator','Electric actuator on equipped residue packages that moves the chop-to-swath/swath door.','8230–9250'],
 ['Windrow chute','Guides long straw into a concentrated windrow when the operator wants to bale or retain straw rather than spread it.','Both'],
 ['Chaff straight brush / wand','High-chaff-condition attachment used on some 250-series residue configurations to help direct chaff flow through the residue system.','8230–9250'],
 ['Left residue spreader disc','Left rotating spreader distributes chaff/chopped residue across part of the cut width.','Both'],
 ['Right residue spreader disc','Right rotating spreader distributes residue across the opposite side. Independent direction/distribution control is available on some deluxe packages.','Both'],
 ['Spreader hydraulic motors','Drive the residue spreaders. Changing hydraulic speed changes spreader tip speed and therefore potential spread width.','Both'],
 ['Spreader speed control','In-cab control for hydraulically driven spreaders. Higher speed generally increases throw, but actual pattern also depends on crop, wind and deflector setup.','Both'],
 ['Spreader position sensor','Reports residue-spreader position on equipped machines and supports control/diagnostics.','Both'],
 ['Spreader dovetail / center divider','Manual center adjustment on 250/260 spreaders used to alter how residue is divided and thrown left/right.','8230–9250'],
 ['Windguards','Adjustable guides around the spreader stream that influence residue trajectory and pattern, particularly in wind.','8230–9250'],
 ['Radar spread sensors','AF sensors observe the residue pattern/conditions used by Radar Spread Automation to maintain more uniform spreading in wind or on slopes.','AF Series'],
 ['MagnaCut rotor','AF integral standard-chop residue processor. It is the chopping element in MagnaCut configurations before residue reaches disc or advanced horizontal spreaders.','AF Series'],
 ['MagnaChop rotor','AF high hood-mounted fine-chop processor designed for higher-intensity residue sizing before advanced horizontal spreading.','AF Series'],
 ['Advanced horizontal spreader','AF high-capacity residue spreader option paired with MagnaCut or MagnaChop to distribute processed residue over wide headers.','AF Series'],
 ['Simple disc spreader','AF residue option using rotating discs behind MagnaCut for a simpler spreading package.','AF Series'],
 ['Feeder drum','Front/rear rotating feeder element supporting the feeder chain and helping it accept the crop mat from the header.','Both'],
 ['Feeder chain tensioning system','Maintains correct feeder-chain tension so slats carry crop consistently without excessive slack or loading.','Both'],
 ['Feeder gearbox','Transfers power into the feeder/header drive. Gearbox or drive problems can look like feeding/capacity problems rather than threshing problems.','Both'],
 ['Feeder reverser drive','Provides reverse rotation for clearing feeder plugs.','Both'],
 ['Feeder faceplate fore/aft actuator','On equipped machines hydraulically changes feeder faceplate angle/position from the cab to match header geometry.','Both'],
 ['Feeder lateral-tilt system','Tilts the header/feeder laterally to follow terrain while maintaining cut height.','Both'],
 ['Feeder lift cylinders','Hydraulic cylinders raising and lowering the feeder/header assembly.','Both'],
 ['Feeder position sensor','Reports feeder/header position for height control, calibration and machine logic.','Both'],
 ['Feedrate drive','PowerPlus CVT/feedrate-capable feeder drive lets automation regulate crop intake/ground speed according to the selected Harvest Command strategy.','8230–9250'],
 ['Rotor CVT drive','Variable drive changes rotor speed without manually changing fixed drive ratios. It must transmit high torque while maintaining commanded rotor speed.','Both'],
 ['Rotor drive speed sensor','Measures actual rotor speed for display, control and protection.','Both'],
 ['Rotor drive speed-limit switches','Protect/monitor the rotor-drive operating range on equipped machines.','Both'],
 ['Concave actuator','Moves the concave assembly to change rotor-to-concave clearance. The mechanical position must agree with the displayed/calibrated value.','Both'],
 ['Concave position sensor','Provides feedback for actual concave position/clearance. Incorrect calibration can make the number on the display differ from the mechanical gap.','Both'],
 ['Cage-vane actuator','Changes cage-vane angle on equipped in-cab/Harvest Command machines, altering crop retention/travel through the rotor cage.','Both'],
 ['Cage-vane position sensor','Feedback used to confirm the commanded cage-vane position.','Both'],
 ['Transition-cone vanes','Guide and accelerate incoming crop from the feeder into the axial rotor path. They are separate from the adjustable rotor-cage vanes farther rearward.','Both'],
 ['Transition-cone wear surface','Replaceable/high-wear surface where the incoming crop mat accelerates into the rotor. Excessive wear changes clearances and crop flow.','Both'],
 ['Front threshing concave','First concave zone under the rotor, where much of initial threshing occurs. Concave style such as large-wire/small-wire changes open area and crop interaction.','Both'],
 ['Rear threshing / separation concave','Later concave/grate zone providing additional release/separation opportunity as the crop mat moves rearward.','Both'],
 ['Large-wire concave','Concave with larger wire/opening geometry, often used where more open area and less restriction are desired. Crop-specific suitability matters.','Both'],
 ['Small-wire concave','Concave with tighter wire spacing used where more retention/threshing control is needed for smaller-grain conditions.','Both'],
 ['Skip-wire concave','Concave configuration with selected wires omitted to increase open area and material/grain passage.','Both'],
 ['Separation grate modules','Replaceable grate sections in the separation area. Their open area determines how easily loose grain can leave the straw mat.','Both'],
 ['Rasp-bar mounting hardware','Secures rasp bars to the rotor. Correct hardware/condition is critical because loose rotor components are a major mechanical hazard.','Both'],
 ['Engine','Supplies power for propulsion, threshing, cleaning, hydraulics, grain handling and residue processing. High engine load can indicate crop throughput is reaching machine capacity.','Both'],
 ['Engine speed sensor','Provides engine RPM to machine controllers for load management and drive control.','Both'],
 ['Engine coolant-temperature sensor','Monitors cooling-system temperature and triggers warnings/protection when engine temperature is excessive.','Both'],
 ['Hydraulic reservoir','Stores hydraulic oil for steering, feeder, unloading, residue and other hydraulic functions depending on configuration.','Both'],
 ['Hydraulic pumps','Create hydraulic flow/pressure for machine functions. A hydraulic supply problem can affect several apparently unrelated actuators at once.','Both'],
 ['Main drive / PTO gearbox','Distributes engine power into major combine mechanical drives.','Both'],
 ['Transmission','Transfers propulsion power to the final drives/tracks and controls travel ranges/speeds.','Both'],
 ['Final drives / planetaries','Reduce speed and multiply torque at the drive wheels/tracks. Heavy-duty planetary configurations are used with high-capacity/tank packages.','Both'],
 ['Differential lock','Locks drive-side speed together to improve traction when conditions require it.','Both'],
 ['Steering axle','Supports rear steering wheels and provides steering geometry. Adjustable versions allow different tread widths.','Both'],
 ['Powered rear axle','Optional driven steering axle adds rear-wheel traction; some configurations provide two-speed power assist.','Both'],
 ['ActiveTrac track drive','Track undercarriage option that spreads machine load over a larger footprint and changes traction/ride characteristics compared with tires.','AF Series'],
 ['Fuel tank','Stores diesel for the engine; capacity differs by model.','Both'],
 ['DEF tank / SCR system','Stores diesel exhaust fluid and supports emissions aftertreatment on applicable engines.','Both'],
 ['Engine air cleaner','Removes dust/chaff from combustion air. Harvest dust loading makes restriction monitoring and maintenance important.','Both'],
 ['Rotary screen / cooling air intake','Keeps large chaff/debris from plugging radiator/cooler airflow.','Both'],
 ['Radiator / cooling package','Rejects heat from engine and machine fluid systems; chaff accumulation reduces cooling capacity.','Both'],
 ['Engine blow-off system','Optional system on some configurations that helps keep engine/cooling areas cleaner in dusty harvest conditions.','8230–9250'],
 ['Battery / electrical supply','Provides starting and controller power. Low voltage can cause controller, actuator and communication faults that resemble component failures.','Both'],
 ['CAN bus','Machine communication network linking displays, controllers, sensors and actuators. Open circuits, shorts, poor power/ground or termination problems can take multiple functions offline.','Both'],
 ['ISOBUS / implement communication','Standardized communication used with compatible headers/implements and displays where equipped.','Both'],
 ['Universal Control Module / machine controllers','Electronic controllers read sensors and command actuators for machine functions. Different modules control different systems; diagnostics should identify the actual controller/circuit before parts replacement.','Both'],
 ['Pro 700 display','Touchscreen used on many 230/240/250-era combines for machine settings, Harvest Command, guidance, yield and diagnostics.','8230–9250'],
 ['Pro 1200 display','Newer touchscreen platform used on AF/260-era machines for machine control, guidance, automation and grain-quality imaging.','AF Series'],
 ['GNSS receiver','Provides position for guidance, mapping, machine-to-machine functions and spatial yield data. Correction service determines guidance accuracy.','Both'],
 ['Steering valve','Hydraulic valve commanded by autoguidance to steer the machine. It is separate from the harvesting systems.','Both'],
 ['Wheel-angle / steering sensor','Provides steering-position feedback for guidance and steering control.','Both'],
 ['Header height-control sensors','Measure header position/contact relative to the ground so automatic header-height control can follow terrain.','Both'],
 ['Header lateral-tilt sensors','Provide terrain/tilt feedback for automatic lateral feeder/header control.','Both'],
 ['Header drive shaft / coupler','Transfers mechanical power from the feeder/header drive to header mechanisms.','Both'],
 ['Header electrical connector','Carries sensor, actuator and communication circuits between combine and header.','Both'],
 ['Header hydraulic couplers','Supply hydraulic functions to the header. Flow/pressure and correct connection affect reel, tilt and other header functions.','Both'],
 ['Cab HVAC','Heating/air-conditioning and pressurization system that keeps the operator environment comfortable and limits dust entry.','Both'],
 ['Rear camera','Provides visibility directly behind the combine for maneuvering and residue observation.','Both'],
 ['Unload-tube camera','Camera aimed at the unloading stream/cart to help the operator position grain accurately.','Both'],
 ['Rear ladder position sensor','Detects ladder position on equipped machines so travel/logic warnings can prevent unsafe operation.','Both'],
 ['High-temperature sensor','Machine protection sensor monitoring areas where abnormal heat could indicate a drive, bearing or other problem.','Both']
 ];
 const shown=items; // Show the complete reference for every machine; family tags identify applicability.
 const q=(document.getElementById('infoSearch')?.value||'').toLowerCase();
 const filtered=q?shown.filter(x=>(x[0]+' '+x[1]).toLowerCase().includes(q)):shown;
 app.innerHTML='<h1>Combine Information</h1><div class="note"><b>'+(S.machine||'Select a machine on Home')+'</b> • '+family+'. Every component is listed individually so you can learn exactly what it does. Machine/year/options can change hardware, so use the operator/parts manual for serial-number-specific service information.</div>'+
 '<input id="infoSearch" class="infoSearch" placeholder="Search component — rotor, pre-sieve, Tri-Sweep, chopper...">'+
 '<div class="infoCount">'+filtered.length+' individual components shown</div>'+
 filtered.map(x=>'<section class="card infoCard"><h2>'+x[0]+'</h2><div class="familyTag">'+x[2]+'</div><p>'+x[1]+'</p></section>').join('');
 const box=document.getElementById('infoSearch'); if(box){box.value=q;box.oninput=()=>{const v=box.value;information();const n=document.getElementById('infoSearch');n.value=v;n.focus();n.setSelectionRange(v.length,v.length)}}
}
function recommendations(){
 const d=S.diagnosticResult;
 if(d){
  const lines=d.data.map(x=>`<div class="rec"><b>${x.name}</b><br>Current: ${x.actual} &nbsp; | &nbsp; Range: ${x.min}–${x.max}<br>${x.pos.toFixed(0)}% through range &nbsp; | &nbsp; Sensitivity: ${x.sens}%</div>`).join('');
  app.innerHTML=`<h1>Recommendations</h1><div class="note"><b>${d.issue} diagnostic complete.</b> Recommendation is based on the settings entered in Diagnose.</div>${card('Entered Machine Data',lines)}${card('Recommended First Adjustment',`<div class="rec"><h3>${d.best.name}</h3><p>Test ${d.word} from <b>${d.best.actual}</b> to about <b>${d.target}</b>.</p><p>If automation needs to react more strongly, test sensitivity from <b>${d.best.sens}%</b> to about <b>${d.newSens}%</b>.</p>${d.second?`<p><b>Second choice:</b> ${d.second.name}. Leave it unchanged until the first adjustment is tested.</p>`:''}<p>Make one change, run a representative distance, then physically verify the result before changing another setting.</p></div>`)}<button class="btn" id="newDiag">NEW DIAGNOSTIC</button>`;
  $('#newDiag').onclick=()=>{S.diagnosticResult=null;save();page='diagnose';render()};
  return;
 }
 let r=[];const has=x=>S.symptoms.includes(x);
 if(has('Unthreshed grain / heads / pods')||S.sample==='Unthreshed material'||S.tailings==='Unthreshed heads / pods')r.push(['THRESHING','Verify grain is still attached. Test more effective threshing with rotor speed and/or concave clearance. Make one change, then physically verify.',['Rotor speed','Concave clearance']]);
 if(has('Rotor loss / free grain in straw')||S.pan.main==='Rotor / separation')r.push(['SEPARATION','Loose grain with straw points to separation. Check crop load and separation opportunity; test rotor/cage-vane strategy from the current baseline and verify with pans.',['Rotor speed','Cage vane position']]);
 if(has('Sieve loss / free grain in chaff')||has('Grain blowing out')||S.pan.main==='Cleaning system')r.push(['CLEANING','Loose grain with chaff points to the cleaning system. Determine whether the shoe is overloaded or airflow is carrying grain out before changing fan or sieve openings.',['Fan speed','Pre-sieve','Upper sieve','Lower sieve']]);
 if(has('Cracked / broken grain')||S.sample==='Cracked / damaged grain')r.push(['GRAIN DAMAGE','Reduce unnecessary threshing/rethreshing. Check rotor aggression, concave clearance and whether clean grain is being recirculated in tailings.',['Rotor speed','Concave clearance']]);
 if(has('Dirty sample / MOG')||S.sample==='Dirty / high MOG')r.push(['DIRTY SAMPLE','Identify whether MOG is being created upstream by aggressive threshing or not removed by the cleaning system. Do not automatically close sieves first.',['Fan speed','Upper sieve','Lower sieve','Rotor speed']]);
 if(S.tailings==='Mostly clean grain')r.push(['TAILINGS','Mostly clean grain in returns can indicate cleaning restriction. Check sieve openings and loading before increasing threshing aggression.',['Upper sieve','Lower sieve']]);
 if(!r.length)r.push(['VERIFY FIRST','Physically classify the problem: attached grain = threshing, loose grain with straw = separation, loose grain with chaff = cleaning. Then make one change and recheck.',[]]);
 app.innerHTML=`<h1>Recommendations</h1><div class="note"><b>One change at a time.</b> Confirm the physical loss location before chasing monitor numbers.</div>${card('Ranked Diagnostic Direction',r.map((x,i)=>`<div class="rec"><h3>${i+1}. ${x[0]}</h3><p>${x[1]}</p>${x[2].length?`<button class="btn tuneBtn" data-ri="${i}">CALCULATE ADJUSTMENT</button>`:''}</div>`).join(''))}<button class="btn" id="saveSetup">SAVE THIS SETUP</button>`;
 $('.tuneBtn').forEach(b=>b.onclick=()=>{const rec=r[Number(b.dataset.ri)];rec[0]==='DIRTY SAMPLE'?openCleaningShoeDiagnostic():openAdjustment(rec)});
 $('#saveSetup').onclick=()=>{S.saved.unshift({date:new Date().toLocaleDateString(),machine:S.machine,crop:S.crop,customer:S.customer,setup:{...S.setup},note:r[0][0]});S.saved=S.saved.slice(0,30);save();alert('Setup saved')}
}
function askShoeSetting(name){
 const min=Number(prompt(name+' — MIN RANGE:'));if(!Number.isFinite(min))return null;
 const max=Number(prompt(name+' — MAX RANGE:'));if(!Number.isFinite(max)||max<=min){alert('Max Range must be greater than Min Range.');return null}
 const sens=Number(prompt(name+' — SENSITIVITY (%):'));if(!Number.isFinite(sens))return null;
 const actual=Number(prompt(name+' — CURRENT POSITION:'));if(!Number.isFinite(actual))return null;
 return {name,min,max,sens,actual,pos:Math.max(0,Math.min(100,(actual-min)/(max-min)*100))};
}
function openCleaningShoeDiagnostic(){
 alert('DIRTY SAMPLE — CLEANING SHOE\\n\\nEnter 4 things for each setting:\\n1. Min Range\\n2. Max Range\\n3. Sensitivity\\n4. Current Position');
 const fan=askShoeSetting('Fan');if(!fan)return;
 const pre=askShoeSetting('Pre-sieve');if(!pre)return;
 const upper=askShoeSetting('Upper sieve');if(!upper)return;
 const lower=askShoeSetting('Lower sieve');if(!lower)return;
 const a=[fan,pre,upper,lower];
 const line=x=>x.name+': '+x.actual+' | Range '+x.min+'–'+x.max+' | '+x.pos.toFixed(0)+'% through range | Sensitivity '+x.sens+'%';
 const room=x=>Math.min(x.actual-x.min,x.max-x.actual)/(x.max-x.min);
 let rec=[];
 if(fan.pos<35)rec.push('Fan is running low in its range. Test a small fan increase first and recheck the sample.');
 else if(fan.pos>90)rec.push('Fan is already near the top of its range. Do not simply increase sensitivity or range until you verify grain is not being blown out.');
 else rec.push('Fan has usable adjustment room. Make only a small increase if light MOG/chaff is the main contamination.');
 if(upper.pos>70)rec.push('Upper sieve is running fairly open. A small closing test may improve the sample; watch shoe loss and returns.');
 else if(upper.pos<15)rec.push('Upper sieve is already near the closed end. Do not keep closing it; restriction may increase returns or loss.');
 else rec.push('Upper sieve is in the middle of its range; keep changes small and use it as the primary sieve test.');
 if(pre.pos>80)rec.push('Pre-sieve is near the open end. Consider a small closing test if excess MOG is passing into the lower shoe.');
 else if(pre.pos<10)rec.push('Pre-sieve is already near minimum. Avoid further closing unless a physical check supports it.');
 if(lower.pos<15)rec.push('Lower sieve is already near minimum. Further closing can drive clean grain into tailings.');
 else if(lower.pos>80)rec.push('Lower sieve is quite open. A small closing test may clean the sample, but watch tailings.');
 const sens=a.sort((x,y)=>room(y)-room(x))[0];
 rec.push('Sensitivity: '+sens.name+' currently has the most safe adjustment room. If automation is not reacting enough, increase its sensitivity about 5–10% before making a large range change.');
 alert('CLEANING SHOE ANALYSIS\\n\\n'+a.map(line).join('\\n')+'\\n\\nFINAL RECOMMENDATION\\n\\n'+rec.map((x,i)=>(i+1)+'. '+x).join('\\n\\n')+'\\n\\nMake one change, run the combine, inspect the sample and verify physical loss before making the next change.');
}
function openAdjustment(rec){
 const settings=rec[2]||[];if(!settings.length)return;
 alert(rec[0]+' — ENTER CURRENT AUTOMATION DATA\\n\\nThe app will check every relevant setting and choose which one should be adjusted first.\\n\\nFor each setting enter: Min Range, Max Range, Sensitivity, Current Position.');
 const data=[];
 for(const name of settings){
   const x=askShoeSetting(name);if(!x)return;data.push(x);
 }
 chooseBestAdjustment(rec[0],data);
}
function adjustmentDirection(problem,name){
 if(name==='Concave clearance'&&problem==='THRESHING')return -1;
 if(name==='Concave clearance'&&problem==='GRAIN DAMAGE')return 1;
 if(problem==='GRAIN DAMAGE'&&name==='Rotor speed')return -1;
 if(problem==='TAILINGS'&&(name==='Upper sieve'||name==='Lower sieve'))return 1;
 if(problem==='DIRTY SAMPLE'&&name==='Rotor speed')return -1;
 return 1;
}
function chooseBestAdjustment(problem,data){
 const scored=data.map(x=>{
   const dir=adjustmentDirection(problem,x.name);
   const room=dir>0?(x.max-x.actual):(x.actual-x.min);
   const roomPct=Math.max(0,Math.min(1,room/(x.max-x.min)));
   const edgePenalty=roomPct<0.1?0.15:1;
   const sensitivityRoom=Math.max(0,100-x.sens)/100;
   return {...x,dir,score:(roomPct*0.8+sensitivityRoom*0.2)*edgePenalty};
 }).sort((a,b)=>b.score-a.score);
 const best=scored[0],dir=best.dir,span=best.max-best.min;
 const step=span*0.07*dir;
 const target=Math.max(best.min,Math.min(best.max,best.actual+step));
 const sensTarget=Math.max(0,Math.min(100,best.sens+10));
 const pos=x=>x.name+': '+x.actual+' | '+x.min+'–'+x.max+' | '+x.pos.toFixed(0)+'% through range | Sensitivity '+x.sens+'%';
 const verb=dir>0?'increase/open':'decrease/tighten';
 const second=scored[1];
 let msg=problem+' ANALYSIS\\n\\n'+data.map(pos).join('\\n')+'\\n\\nRECOMMENDED FIRST ADJUSTMENT\\n\\n'+best.name+' is the best first adjustment based on the entered ranges, actual positions and available adjustment room.\\n\\nTest: '+verb+' '+best.name+' from '+best.actual+' to about '+Number(target.toFixed(1))+'. Increase its automation sensitivity from '+best.sens+'% to about '+Number(sensTarget.toFixed(0))+'% if you want Harvest Command to react more strongly.\\n\\n';
 if(second)msg+='SECOND CHOICE\\n'+second.name+' has the next-best usable adjustment room, but leave it alone until you test the first change.\\n\\n';
 msg+='Make one change only, run a representative distance, then inspect the physical result before changing another setting.';
 alert(msg);
}
function showAdjustment(problem,setting,min,max,sens,actual,severity){
 const span=max-min,pos=Math.max(0,Math.min(100,(actual-min)/span*100));
 const sev=/severe/i.test(severity)?3:/mild/i.test(severity)?1:2;
 let direction=1,reason='increase';
 if(problem==='GRAIN DAMAGE'){direction=-1;reason='decrease'}
 if(problem==='CLEANING'&&setting==='Fan speed'&&S.symptoms.includes('Grain blowing out')){direction=-1;reason='decrease'}
 if(problem==='DIRTY SAMPLE'&&setting==='Rotor speed'){direction=-1;reason='decrease'}
 if(problem==='TAILINGS'&&(setting==='Upper sieve'||setting==='Lower sieve')){direction=1;reason='open'}
 if(setting==='Concave clearance'&&problem==='THRESHING'){direction=-1;reason='tighten'}
 if(setting==='Concave clearance'&&problem==='GRAIN DAMAGE'){direction=1;reason='open'}
 const pctStep=[0,0.04,0.07,0.10][sev], rawStep=span*pctStep*direction;
 let target=actual+rawStep;target=Math.max(min,Math.min(max,target));
 let sensTarget=Math.max(0,Math.min(100,sens+(direction*([0,5,10,15][sev]))));
 const atLimit=(direction>0&&pos>=90)||(direction<0&&pos<=10);
 const room=direction>0?max-actual:actual-min;
 const msg=`${setting} is currently ${pos.toFixed(0)}% through the entered range (${min}–${max}), with the combine actually at ${actual}.\\n\\nSuggested test: ${reason} ${setting} from ${actual} to about ${Number(target.toFixed(1))}. Change sensitivity from ${sens}% to about ${Number(sensTarget.toFixed(0))}%.\\n\\n${atLimit?'IMPORTANT: The combine is already near the '+(direction>0?'top':'bottom')+' of this range. There is only '+Number(room.toFixed(1))+' of adjustment room left. Consider shifting/widening the automation range in the required direction rather than only increasing sensitivity.':'Keep the entered range for the first test. There is still usable room in the requested direction.'}\\n\\nMake one change, harvest a representative distance, then verify the physical result with the sample/pans before making another change.`;
 alert(msg);
}
function setups(){app.innerHTML=`<h1>Saved Setups</h1>${S.saved.length?S.saved.map(x=>card(`${x.machine||'Machine'} • ${x.crop||'Crop'}`,`<b>${x.customer||'No customer'}</b><div class="muted">${x.date} • ${x.note}</div><p>Rotor ${x.setup.rotor||'—'} • Concave ${x.setup.concave||'—'} • Fan ${x.setup.fan||'—'} • Pre-sieve ${x.setup.presieve||'—'} • Upper ${x.setup.upper||'—'} • Lower ${x.setup.lower||'—'}</p>`)).join(''):card('No saved setups','Save a setup from the Recommendations tab after you have verified it in the field.')}`}
const pages={home,diagnose,pans,information,recommend:recommendations,setups};
function render(){pages[page]();status();$$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$$('[data-go]').forEach(b=>b.onclick=()=>{page=b.dataset.go;render()})}
$$('#nav button').forEach(b=>b.onclick=()=>{page=b.dataset.page;render()});
window.addEventListener('online',offline);window.addEventListener('offline',offline);
function offline(){const e=$('#offlineStatus');e.textContent=navigator.onLine?'OFFLINE READY ✓':'OFFLINE MODE ✓';e.style.background=navigator.onLine?'#286c37':'#7a1d1d'}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').then(()=>offline()).catch(()=>{$('#offlineStatus').textContent='OFFLINE CACHE ERROR'});
render();offline();

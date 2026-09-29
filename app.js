// BeeFlow v12 stable — QA, bezpieczniejszy kreator i odporność na literówki
const msgs=document.getElementById('msgs');
    const form=document.getElementById('chatForm');
    const inp=document.getElementById('chatInput');
    const overlay=document.getElementById('previewOverlay');
    const generatedSite=document.getElementById('generatedSite');
    const progressFill=document.getElementById('progressFill');
    const progressText=document.getElementById('progressText');
    const chatBox=document.getElementById('chatbox');
    const chatClose=document.getElementById('chatClose');
    const chatBackdrop=document.getElementById('chatBackdrop');
    let lastChatOpener=null;

    function setViewportHeight(){
      const h=(window.visualViewport&&window.visualViewport.height)?window.visualViewport.height:window.innerHeight;
      document.documentElement.style.setProperty('--app-vh',`${Math.round(h)}px`);
    }
    function openMainChat(opener){
      lastChatOpener=opener||document.activeElement;
      initChat();
      chatBox.classList.add('open');
      chatBox.setAttribute('aria-hidden','false');
      chatBackdrop.classList.add('open');
      chatBackdrop.setAttribute('aria-hidden','false');
      if(window.innerWidth<=760)document.body.classList.add('chat-open');
      setViewportHeight();
      setTimeout(()=>{inp.focus({preventScroll:true});msgs.scrollTop=msgs.scrollHeight},120);
    }
    function closeMainChat(){
      chatBox.classList.remove('open');
      chatBox.setAttribute('aria-hidden','true');
      chatBackdrop.classList.remove('open');
      chatBackdrop.setAttribute('aria-hidden','true');
      document.body.classList.remove('chat-open');
      if(location.hash==='#chatbox')history.replaceState(null,'',location.pathname+location.search);
      if(lastChatOpener&&typeof lastChatOpener.focus==='function')setTimeout(()=>lastChatOpener.focus({preventScroll:true}),30);
    }
    document.querySelectorAll('.js-open-chat').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openMainChat(el)}));
    chatClose.addEventListener('click',e=>{e.preventDefault();closeMainChat()});
    chatBackdrop.addEventListener('click',closeMainChat);
    window.addEventListener('resize',setViewportHeight,{passive:true});
    if(window.visualViewport){window.visualViewport.addEventListener('resize',setViewportHeight,{passive:true});window.visualViewport.addEventListener('scroll',setViewportHeight,{passive:true})}
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&chatBox.classList.contains('open'))closeMainChat()});
    setViewportHeight();
    if(location.hash==='#chatbox')setTimeout(()=>openMainChat(document.querySelector('.js-open-chat')),80);
    const questions=(window.BEEFLOW_CONFIG&&window.BEEFLOW_CONFIG.questions)||[];

    const chat={started:false,step:0,phase:'ask',pendingKey:null,pendingValue:'',needsName:false,nameRound:0,lastSuggestedName:'',extraRound:0,industryConfirmed:false,industryConfidence:0,industrySource:'',data:{company:'',businessBrief:'',industry:'',city:'',services:'',style:'',usp:'',headline:'',phone:'',email:'',logo:'',logoMode:'none',logoSeed:0,photos:[],projectPhotos:[],extras:[],extraNotes:'',projectsEnabled:false}};

    function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
    function bubble(text,who='ai',html=false){const d=document.createElement('div');d.className='bubble '+who;if(html)d.innerHTML=text;else d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
    function ai(text,html=false){setTimeout(()=>bubble(text,'ai',html),120)}
    function updateProgress(){const total=questions.length;const done=Math.min(chat.step,total);progressFill.style.width=((done/total)*100)+'%';progressText.textContent=chat.phase==='extras'?'Podstawowe dane zebrane — dodatki':chat.phase==='upload'?'Dane zebrane — materiały':chat.step>=total?'Podstawowe dane zebrane':`Krok ${Math.min(chat.step+1,total)} z ${total}`}
    function initChat(){
  if(chat.started){setTimeout(()=>inp.focus(),100);return}
  chat.started=true;msgs.innerHTML='';
  bubble('Cześć 👋 Jestem kreatorem strony demo. Możesz pisać normalnymi zdaniami — jeśli czegoś nie będę pewien, zapytam zamiast zgadywać. Literówki też nie powinny wykoleić rozmowy.','ai');
  setTimeout(()=>askCurrent(),180)
}
    function addChips(items,handler){const q=document.createElement('div');q.className='quick';items.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=item;b.onclick=()=>handler?handler(item):submitMessage(item);q.appendChild(b)});msgs.appendChild(q);msgs.scrollTop=msgs.scrollHeight}
    function addConfirmButtons(){const row=document.createElement('div');row.className='confirmRow';[['Tak, zgadza się','yes','primary'],['Chcę poprawić','no','']].forEach(([txt,val,cls])=>{const b=document.createElement('button');b.type='button';b.className='confirmBtn '+cls;b.textContent=txt;b.onclick=()=>handleConfirmation(val);row.appendChild(b)});msgs.appendChild(row);msgs.scrollTop=msgs.scrollHeight}
    function normalizeServices(raw=''){
  const text=String(raw).replace(/\s+/g,' ').trim();
  if(!text)return [];
  let items=text.split(/[,;\n•]+/).map(x=>x.trim()).filter(Boolean);
  if(items.length===1 && /\s+(?:oraz|i)\s+/i.test(text) && text.length<120){
    const split=text.split(/\s+(?:oraz|i)\s+/i).map(x=>x.trim()).filter(Boolean);
    if(split.length>1 && split.length<=6)items=split;
  }
  return [...new Set(items)].slice(0,8)
}
    
    function fieldSummary(key,value){if(key==='services')return normalizeServices(value).join(' • ');if(key==='usp'&&!value)return 'bez dodatkowego wyróżnika';if(key==='email'&&!value)return 'e-mail ukryty';return value}
    function intentText(t=''){
  return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()
}
    function editDistance(a='',b=''){a=String(a);b=String(b);const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)dp[i][0]=i;for(let j=0;j<=b.length;j++)dp[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return dp[a.length][b.length]}

const INDUSTRY_PROFILES={
  childcare:{label:'Opieka nad dziećmi',names:['MaliRazem','TuliMiejsce','DobryStart','BliskoDziecka','MaliOdkrywcy','TęczowyKącik']},
  cartrade:{label:'Import i sprzedaż samochodów',names:['AutoSelect','MotoSource','CarBridge','AutoPort','DriveSelect','MotoPrime']},
  greenhouse:{label:'Szklarnie ogrodowe',names:['GreenForma','PolyGarden','GardenFrame','VitaGlass','GreenNest','OgroForma']},
  gates:{label:'Bramy i ogrodzenia',names:['StalForma','BramaLab','StalPoint','ForgeLine','SolidGate','MetalForma']},
  auto:{label:'Detailing samochodowy',names:['DetailForge','AutoGlow','PrimeDetail','ShineLab','DetailPoint','AutoForma']},
  dental:{label:'Stomatologia',names:['DentaNova','SmilePoint','NovaDent','DentCare','DentAura','WhiteDent']},
  build:{label:'Usługi budowlane i remontowe',names:['SolidDom','BuildForma','ProConstruct','DomPoint','FormaBud','BuildLab']},
  beauty:{label:'Beauty i kosmetyka',names:['AuraStudio','PureLine','NovaBeauty','GlowRoom','FormaBeauty','LunaStudio']},
  transport:{label:'Transport i przeprowadzki',names:['MovePoint','CargoFlow','TransForma','RoutePro','FastLine','MoveLab']},
  plumbing:{label:'Hydraulika i instalacje',names:['HydroPoint','AquaSerwis','InstalPro','HydroForma','AquaTech','FlowSerwis']},
  electrical:{label:'Usługi elektryczne',names:['VoltPoint','ElektroForma','VoltLab','InstalVolt','ElektroPro','PowerLine']},
  hvac:{label:'Klimatyzacja i wentylacja',names:['ClimaPoint','AirForma','ClimaPro','AirFlow Tech','ClimaLab','FreshAir']},
  cleaning:{label:'Usługi sprzątające',names:['CleanPoint','PureHome','CleanForma','FreshSpace','CzystyKąt','CleanLab']},
  autoservice:{label:'Serwis samochodowy',names:['MotoSerwis','AutoPoint','GaragePro','MotoLab','AutoCare','DriveSerwis']},
  bicycle:{label:'Serwis rowerowy',names:['BikePoint','VeloSerwis','BikeLab','VeloPro','Rowerownia','VeloPoint']},
  photo:{label:'Fotografia',names:['FrameStudio','KadrPoint','LumaFoto','KadrLab','FotoForma','LumeStudio']},
  accounting:{label:'Księgowość',names:['SaldoPro','KontoForma','BilansPoint','SaldoLab','KsięgaPro','FinForma']},
  pet:{label:'Usługi dla zwierząt',names:['PupilPoint','PetCare','PupilLab','PetForma','HappyPet','PupilPro']},
  food:{label:'Gastronomia',names:['SmakPoint','BistroForma','DobrySmak','FoodLab','Smakownia','BistroPro']},
  fitness:{label:'Trening i fitness',names:['FormaLab','FitPoint','MoveFit','CoreStudio','FitForma','ActiveLab']}
};

function tokenNear(token,target,maxDistance){
  if(!token||!target)return false;
  if(token.startsWith(target)||target.startsWith(token))return Math.min(token.length,target.length)>=4;
  return Math.abs(token.length-target.length)<=maxDistance && editDistance(token,target)<=maxDistance
}
function hasNearToken(text,targets,maxDistance=1){
  const tokens=intentText(text).split(' ').filter(Boolean);
  return targets.some(target=>tokens.some(token=>tokenNear(token,target,maxDistance)))
}
function hasAny(text,terms){const x=intentText(text);return terms.some(t=>x.includes(intentText(t)))}
function detectIndustry(text=''){
  const raw=String(text),x=intentText(raw),tokens=x.split(' ').filter(Boolean);
  const has=(...terms)=>terms.some(t=>x.includes(t));
  const near=(...terms)=>terms.some(t=>tokens.some(tok=>tokenNear(tok,t,t.length>=8?2:1)));
  const pair=(a,b)=>a&&b;
  const car=tokens.some(tok=>['aut','auta','auto','samochod','samochody','samochodu','pojazd','pojazdy'].includes(tok))||has('samoch','pojazd')||near('samochod','pojazd');
  const kids=has('dziec','dziecko','dzieci','rodzic','maluch')||near('dziecmi','dziecko','rodzice','maluchy');

  if(pair(kids,has('opieka','opiekuj','nian','zlob','przedszkol','pilnuj','zajecia')||near('opiekujemy','opiekuje','niania','przedszkole')))return {key:'childcare',label:INDUSTRY_PROFILES.childcare.label,confidence:.98};
  if(has('zlob','przedszkol','klub malucha','niania','babysit'))return {key:'childcare',label:INDUSTRY_PROFILES.childcare.label,confidence:.96};
  if(pair(car,has('import','sprowadz','zagran','komis','handel','sprzedaz')||near('sprowadzamy','sprowadzaniem','importujemy')))return {key:'cartrade',label:INDUSTRY_PROFILES.cartrade.label,confidence:.97};
  if(has('szklarn','poliwegl','greenhouse','tunel ogrod'))return {key:'greenhouse',label:INDUSTRY_PROFILES.greenhouse.label,confidence:.99};
  if(has('bram','ogrodzen','furt','wjazdowa') || pair(has('spaw','stal'),has('bram','ogrodzen','furt')))return {key:'gates',label:INDUSTRY_PROFILES.gates.label,confidence:.97};
  if(has('detail','powleka ceramic','powloka ceramic','korekta lakier','polerowanie lakier')||pair(car,has('ceram','poler','detailing')))return {key:'auto',label:INDUSTRY_PROFILES.auto.label,confidence:.96};
  if(has('stomatolog','dentyst','gabinet dent','gabinet stomat','higieniz','leczenie kanal','wybielanie zeb'))return {key:'dental',label:INDUSTRY_PROFILES.dental.label,confidence:.99};
  if(has('paznok','manicure','pedicure','rzesa','rzesy','brwi','kosmetycz','beauty','makijaz','fryzjer'))return {key:'beauty',label:INDUSTRY_PROFILES.beauty.label,confidence:.98};
  if(has('hydraul','wod kan','instalacje wod','ogrzewanie podlog','piec gaz'))return {key:'plumbing',label:INDUSTRY_PROFILES.plumbing.label,confidence:.98};
  if(has('elektryk','instalacje elek','elektryczne','rozdzieln','gniazdka'))return {key:'electrical',label:INDUSTRY_PROFILES.electrical.label,confidence:.98};
  if(has('klimatyz','wentylac','rekuperac'))return {key:'hvac',label:INDUSTRY_PROFILES.hvac.label,confidence:.98};
  if(has('sprzatan','sprzatam','sprzataj','cleaning','mycie okien'))return {key:'cleaning',label:INDUSTRY_PROFILES.cleaning.label,confidence:.97};
  if(has('mechanik','warsztat samoch','serwis samoch','naprawa samoch','naprawiam auta'))return {key:'autoservice',label:INDUSTRY_PROFILES.autoservice.label,confidence:.97};
  if(has('serwis rower','naprawa rower','rowerowy','rowery napraw'))return {key:'bicycle',label:INDUSTRY_PROFILES.bicycle.label,confidence:.97};
  if(has('fotograf','fotografia','sesje zdjec','sesja zdjec'))return {key:'photo',label:INDUSTRY_PROFILES.photo.label,confidence:.98};
  if(has('ksiegow','rachunkow','biuro rachunk','podatki firm'))return {key:'accounting',label:INDUSTRY_PROFILES.accounting.label,confidence:.98};
  if(has('przeprowadz','kurier','transport','przewoz','dostawy'))return {key:'transport',label:INDUSTRY_PROFILES.transport.label,confidence:.93};
  if(has('weteryn','groomer','strzyzenie ps','hotel dla ps','opieka nad psem','opieka nad zwierz'))return {key:'pet',label:INDUSTRY_PROFILES.pet.label,confidence:.96};
  if(has('restaurac','pizzeria','catering','bistro','kawiarnia','gastronom'))return {key:'food',label:INDUSTRY_PROFILES.food.label,confidence:.97};
  if(has('trener personal','silownia','fitness','trening personal','studio trening'))return {key:'fitness',label:INDUSTRY_PROFILES.fitness.label,confidence:.97};

  // Budowlanka celowo wymaga kontekstu, żeby „budujemy zaufanie” nie robiło firmy budowlanej.
  const buildWord=has('remont','wykonczen','elewac','murars','tynkar','posadzk','budowl')||near('remonty','wykonczenia','budowlane');
  const buildContext=has('dom','mieszkan','lokal','scian','dach','elewac','lazien','kuchni','fundament','taras');
  if(buildWord || has('budowa domu','budowa domow') || (has('buduj','budowa')&&buildContext))return {key:'build',label:INDUSTRY_PROFILES.build.label,confidence:.94};

  return {key:'general',label:'',confidence:0}
}
function manualIndustryLabel(text=''){
  let cleaned=String(text).trim().replace(/[.,;:!?]+$/g,'').replace(/\s+/g,' ');
  cleaned=cleaned.replace(/^(moja branża to|moja branza to|branża to|branza to|zajmujemy się|zajmujemy sie|zajmuję się|zajmuje sie|prowadzę|prowadze|prowadzimy)\s+/i,'').trim();
  const words=cleaned.split(' ').filter(Boolean).slice(0,7);
  if(!words.length)return 'Usługi lokalne';
  const v=words.join(' ');
  return v.charAt(0).toUpperCase()+v.slice(1)
}

    function isYes(t){const x=intentText(t);if(/^(tak|zgadza sie|zgadza|dokladnie|ok|okej|dobrze|zostaw|pasuje|ta odpowiada|moze byc|super|jasne)\b/.test(x))return true;return x.length<=5&&['tak','tka','okej'].some(v=>editDistance(x,v)<=1)}
    function isNo(t){const x=intentText(t);if(/^(nie|inna|inny|zmien|popraw|nie pasuje|nie odpowiada|zle)\b/.test(x))return true;return x.length<=4&&['nie','nei'].some(v=>editDistance(x,v)<=1)}
    function isNoName(t){
  const x=intentText(t);if(!x)return false;
  if(/\b(mam|mamy|posiadam|posiadamy)\b/.test(x) && !/\bnie\b/.test(x))return false;
  const compact=x.replace(/\s+/g,'');
  const variants=['braknazwy','beznazwy','niemamnazwy','niemanazwy','niemamynazwy','nieposiadamnazwy','nieposiadamynazwy','niemamjeszczenazwy','jeszczeniemamnazwy','niemamfirmynazwy'];
  if(variants.some(v=>Math.abs(v.length-compact.length)<=3&&editDistance(compact,v)<=3))return true;
  const tokens=x.split(' ');
  const hasName=tokens.some(tok=>tokenNear(tok,'nazwa',1)||tokenNear(tok,'nazwy',1)||tokenNear(tok,'nazwe',1));
  const absence=tokens.some(tok=>['nie','brak','bez','jeszcze'].includes(tok)||tokenNear(tok,'brak',1));
  return hasName&&absence
}
    function handleNoNameIntent(){
      chat.needsName=true;chat.data.company='';chat.pendingKey=null;chat.pendingValue='';
      ai('Rozumiem — nie masz jeszcze nazwy firmy. Literówka nie szkodzi 🙂 Nie zapiszę tej odpowiedzi jako nazwy.');
      if(chat.data.industry){chat.phase='naming';setTimeout(()=>offerNameSuggestion(true),220);return}
      chat.phase='ask';
      const current=questions[chat.step];
      if(current&&current.key==='company')chat.step++;
      setTimeout(askCurrent,220);
    }
    function sanitizeValue(key,t){
  const v=String(t).trim();
  if(key==='usp'&&/^(pomin|pomiń|brak|nic|nie mam)$/i.test(v))return '';
  if(key==='email'&&/^(pomin|pomiń|brak|nie chce|nie chcę)$/i.test(v))return '';
  return v
}
    function askCurrent(){updateProgress();const next=questions[chat.step];if(!next){startExtras();return}chat.phase='ask';chat.pendingKey=next.key;ai(next.q);if(next.chips)setTimeout(()=>addChips(next.chips),260)}
    function confirmValue(key,value){chat.phase='confirm';chat.pendingKey=key;chat.pendingValue=value;ai(`<div class="chatSummary"><b>Rozumiem to tak:</b><br>${esc(fieldLabel(key))}: <b>${esc(fieldSummary(key,value))}</b><span class="smartHint">Nie przejdę dalej, dopóki tego nie potwierdzisz.</span></div>`,true);setTimeout(addConfirmButtons,170)}
    
    

    function nameTokens(industry=''){
  const detected=detectIndustry(industry||chat.data.businessBrief||'');
  return (INDUSTRY_PROFILES[detected.key]&&INDUSTRY_PROFILES[detected.key].names)||['Nexa','VeroPoint','NovaForma','Primeo','Noviq','FormaOne']
}
    function scoreName(name){let score=7;const len=name.replace(/\s/g,'').length;if(len>=6&&len<=12)score+=1;if(!/[0-9]/.test(name))score+=.5;if(name.split(/\s+/).length<=2)score+=.5;return Math.min(9.5,score).toFixed(1)}
    function nameReason(name){const parts=[];if(name.length<15)parts.push('krótka');if(name.split(/\s+/).length<=2)parts.push('łatwa do zapamiętania');parts.push('nadaje się do logo i domeny');return parts.join(', ')}
    function offerNameSuggestion(forceAlternative=false){
  chat.phase='naming';chat.needsName=true;
  const list=nameTokens(chat.data.industry);const idx=(chat.nameRound++)%list.length;
  let proposed=list[idx];if(proposed===chat.lastSuggestedName)proposed=list[(idx+1)%list.length];chat.lastSuggestedName=proposed;
  ai(`<div class="nameProposal"><span class="nameScore">Propozycja robocza</span><strong>${esc(proposed)}</strong><p>${esc(nameReason(proposed))}. To jeszcze nie jest sprawdzenie dostępności domeny ani znaku towarowego — zrobimy je przed wyborem finalnej marki.</p></div>`,true);
  setTimeout(()=>addChips(['Tak, ta nazwa pasuje','Pokaż inną nazwę','Wpiszę własną nazwę'],handleNameChoice),200)
}
    function handleNameChoice(choice){if(/tak/i.test(choice)){confirmValue('company',chat.lastSuggestedName);return}if(/inną/i.test(choice)){offerNameSuggestion(true);return}chat.phase='naming-custom';ai('Jasne. Wpisz własną nazwę firmy — zatrzymam się na tym kroku, dopóki jej nie zaakceptujesz.')}

    function looksLikeBusinessDescription(t=''){
  const x=String(t).trim(), n=intentText(x), words=n.split(' ').filter(Boolean);
  if(words.length<2)return false;
  const starts=/^(zajmuje|zajmujemy|prowadz|ofer|robimy|wykon|sprowadz|sprzed|opiekuj|pomagamy|serwis|napraw|montuj|produkuj)/.test(words[0]||'');
  const sentence=/\b(sie|klient|rodzic|uslug|zlecen|prac|wykonujemy|oferujemy|pomagamy)\b/.test(n);
  return starts || (words.length>=5&&sentence)
}
    function confirmDetectedIndustry(){
  let detected=detectIndustry(chat.data.businessBrief||chat.data.industry||'');
  if(!detected.confidence && chat.data.industry){
    detected={key:'general',label:manualIndustryLabel(chat.data.industry),confidence:.7}
  }
  if(!detected.confidence){
    chat.phase='industry-manual';chat.industryConfirmed=false;
    ai('Nie chcę zgadywać branży na podstawie samego opisu. Napisz proszę w 2–6 słowach, jak nazwałbyś swoją branżę, np. „opieka nad dziećmi”, „import samochodów”, „salon paznokci”.');
    return
  }
  chat.data.industry=detected.label;chat.industryConfidence=detected.confidence;chat.phase='industry-confirm';
  ai(`<div class="chatSummary"><b>Sprawdzam, czy dobrze zrozumiałem:</b><br>Branża: <b>${esc(detected.label)}</b><span class="smartHint">Nie pójdę dalej, dopóki tego nie potwierdzisz.</span></div>`,true);
  setTimeout(()=>addChips(['Tak, dokładnie','Nie — popraw branżę'],choice=>{
    bubble(choice,'user');
    if(/^Tak/i.test(choice)){
      chat.industryConfirmed=true;
      if(chat.needsName){offerNameSuggestion();return}
      chat.phase='ask';setTimeout(askCurrent,160);return
    }
    chat.phase='industry-manual';chat.industryConfirmed=false;
    ai('Jasne. Napisz własnymi słowami nazwę branży w 2–6 słowach. Tym razem potraktuję ją jako kategorię, a nie opis firmy.')
  }),180)
}


    

    function handleAskAnswer(t){
  const current=questions[chat.step];if(!current){startExtras();return}
  const key=current.key;
  if(key==='company'){
    if(isNoName(t)){
      chat.needsName=true;chat.data.company='';chat.step++;
      ai('Jasne — nie masz jeszcze nazwy. Najpierw poznam firmę i branżę, a potem zaproponuję nazwę.');setTimeout(askCurrent,180);return
    }
    if(looksLikeBusinessDescription(t)){
      chat.needsName=true;chat.data.company='';chat.data.businessBrief=t;
      const cityIndex=questions.findIndex(q=>q.key==='city');chat.step=cityIndex>=0?cityIndex:Math.min(chat.step+2,questions.length);
      ai('To wygląda jak opis działalności, nie jak nazwa firmy. Nie zapiszę tego jako nazwy — użyję opisu tylko do rozpoznania branży.');
      setTimeout(confirmDetectedIndustry,180);return
    }
    if(intentText(t).split(' ').length>7){
      ai('To wygląda bardziej jak opis firmy niż nazwa. Jeśli to naprawdę nazwa, wpisz ją krócej. Jeśli nie masz nazwy, napisz „nie mam nazwy”.');return
    }
  }
  const value=sanitizeValue(key,t);
  if(key==='businessBrief'&&value.length<8){ai('Napisz proszę jedno krótkie zdanie o tym, czym zajmuje się firma. Dzięki temu nie będę zgadywał branży.');return}
  if(key==='services'&&!normalizeServices(value).length){ai('Podaj proszę przynajmniej jedną usługę. Możesz pisać normalnie albo oddzielić usługi przecinkami.');return}
  if(key==='phone'){
    const digits=value.replace(/\D/g,'');
    if(digits.length<7){ai('Ten numer wygląda na zbyt krótki. Sprawdź proszę cyfry i wpisz numer jeszcze raz.');return}
  }
  if(key==='email'&&value&& !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value)){
    ai('Ten adres e-mail wygląda na niepełny. Wpisz go ponownie albo napisz „pomiń”.');return
  }
  confirmValue(key,value)
}

    function submitMessage(text){
  const t=(text??inp.value).trim();if(!t)return;bubble(t,'user');inp.value='';
  const currentKey=questions[chat.step]&&questions[chat.step].key;
  if(isNoName(t)&&(currentKey==='company'||chat.pendingKey==='company'||chat.phase==='naming'||chat.phase==='naming-custom')){handleNoNameIntent();return}
  if(detectGlobalCorrection(t))return;
  if(chat.phase==='confirm'){
    if(isYes(t)){handleConfirmation('yes');return}
    if(isNo(t)){handleConfirmation('no');return}
    chat.pendingValue=sanitizeValue(chat.pendingKey,t);confirmValue(chat.pendingKey,chat.pendingValue);return
  }
  if(chat.phase==='industry-confirm'){
    if(isYes(t)){
      chat.industryConfirmed=true;if(chat.needsName){offerNameSuggestion();return}chat.phase='ask';setTimeout(askCurrent,150);return
    }
    if(isNo(t)){chat.phase='industry-manual';chat.industryConfirmed=false;ai('Jasne. Napisz w 2–6 słowach, jak nazwałbyś branżę.');return}
    chat.data.industry=deriveIndustryLabel(t,true);chat.industryConfidence=.7;confirmDetectedIndustry();return
  }
  if(chat.phase==='industry-manual'){
    chat.data.industry=deriveIndustryLabel(t,true);chat.industryConfidence=.7;chat.phase='industry-confirm';
    ai(`<div class="chatSummary"><b>Ustawiam branżę jako:</b><br><b>${esc(chat.data.industry)}</b><span class="smartHint">Potwierdź albo popraw jeszcze raz.</span></div>`,true);
    setTimeout(()=>addChips(['Tak, dokładnie','Nie — popraw branżę'],choice=>{bubble(choice,'user');if(/^Tak/i.test(choice)){chat.industryConfirmed=true;if(chat.needsName)offerNameSuggestion();else{chat.phase='ask';setTimeout(askCurrent,150)}}else{chat.phase='industry-manual';ai('Okej — wpisz branżę jeszcze raz, krótko i konkretnie.')}}),170);return
  }
  if(chat.phase==='naming'){
    if(isNoName(t)){handleNoNameIntent();return}
    if(/inna|inny|kolejn|bardziej|cos|propozycj|jeszcze/.test(intentText(t))){offerNameSuggestion(true);return}
    if(isYes(t)){confirmValue('company',chat.lastSuggestedName);return}
    if(looksLikeBusinessDescription(t)){
      chat.data.businessBrief=(chat.data.businessBrief?chat.data.businessBrief+'; ':'')+t;
      ai('To wygląda jak dalszy opis działalności, nie jak nazwa. Zachowuję go jako kontekst firmy i nie zapisuję jako nazwy.');setTimeout(confirmDetectedIndustry,160);return
    }
    confirmValue('company',t);return
  }
  if(chat.phase==='naming-custom'){
    if(isNoName(t)){handleNoNameIntent();return}
    if(looksLikeBusinessDescription(t)||intentText(t).split(' ').length>7){ai('To wygląda jak opis działalności. Wpisz proszę samą nazwę firmy, np. „AutoSelect”.');return}
    confirmValue('company',t);return
  }
  if(chat.phase==='extras'){handleExtraAnswer(t);return}
  if(chat.phase==='upload'){ai('Na tym etapie użyj pól do logo/zdjęć albo przycisku „Wygeneruj profesjonalne demo”.');return}
  handleAskAnswer(t)
}
    
function resetChat(){
  chat.started=false;chat.step=0;chat.phase='ask';chat.pendingKey=null;chat.pendingValue='';chat.needsName=false;chat.nameRound=0;chat.lastSuggestedName='';chat.extraRound=0;chat.industryConfirmed=false;chat.industryConfidence=0;chat.industrySource='';
  chat.data={company:'',businessBrief:'',industry:'',city:'',services:'',style:'',usp:'',headline:'',phone:'',email:'',logo:'',logoMode:'none',logoSeed:0,photos:[],projectPhotos:[],extras:[],extraNotes:'',projectsEnabled:false};
  inp.disabled=false;form.classList.remove('disabledInput');msgs.innerHTML='';updateProgress();initChat()
}
const resetBtn=document.getElementById('chatReset');if(resetBtn)resetBtn.addEventListener('click',()=>{if(confirm('Zacząć projekt od nowa? Obecne dane demo zostaną wyczyszczone.'))resetChat()});

form.addEventListener('submit',e=>{e.preventDefault();submitMessage();requestAnimationFrame(()=>{inp.focus({preventScroll:true});msgs.scrollTop=msgs.scrollHeight})});

    function startExtras(){chat.step=questions.length;chat.phase='extras';updateProgress();inp.disabled=false;form.classList.remove('disabledInput');ai('Podstawowe dane są gotowe. Czy chcesz dodać coś jeszcze do strony? Możesz napisać np. „zakładkę Projekty”, „FAQ”, „cennik”, „opinie klientów” albo po prostu „nie”.');setTimeout(()=>addChips(['Nie, to wszystko','Projekty / wizualizacje','FAQ','Cennik','Opinie klientów'],handleExtraChoice),240)}
    function addExtra(label){if(!chat.data.extras.includes(label))chat.data.extras.push(label);if(/projekt|wizual/i.test(label))chat.data.projectsEnabled=true}
    function handleExtraChoice(choice){bubble(choice,'user');handleExtraAnswer(choice,true)}
    function handleExtraAnswer(t,alreadyBubbled=false){const x=t.toLowerCase();if(!alreadyBubbled&&msgs.lastElementChild?.classList.contains('user')===false)bubble(t,'user');if(/^(nie|nie,|to wszystko|koniec|wystarczy)/i.test(t)){showUploadStep();return}if(/projekt|wizual/.test(x)){addExtra('Projekty / wizualizacje');ai('Super — dodam osobną sekcję „Projekty / wizualizacje”. W następnym kroku dostaniesz osobne pole do wrzucenia projektów, niezależnie od zdjęć realizacji.')}else if(/faq|pytan/.test(x)){addExtra('FAQ');ai('Dodaję sekcję FAQ. W demo przygotuję przykładowe pytania na podstawie oferty.')}else if(/cennik|cen/.test(x)){addExtra('Cennik');ai('Dodaję sekcję cennika / wyceny.')}else if(/opini|recenz/.test(x)){addExtra('Opinie klientów');ai('Dodaję sekcję opinii klientów.')}else{chat.data.extraNotes=(chat.data.extraNotes?chat.data.extraNotes+'; ':'')+t;addExtra(t);ai('Dodałem tę informację do projektu strony.')}
      setTimeout(()=>{ai('Chcesz dodać jeszcze coś, czy przechodzimy do zdjęć, logo i projektów?');addChips(['Przejdź dalej','Projekty / wizualizacje','FAQ','Cennik','Opinie klientów'],c=>{if(c==='Przejdź dalej'){bubble(c,'user');showUploadStep()}else handleExtraChoice(c)})},230)}

    function showUploadStep(){
      chat.phase='upload';updateProgress();inp.disabled=true;form.classList.add('disabledInput');
      const wrap=document.createElement('div');wrap.className='uploadWrap';wrap.innerHTML=`
        <div class="uploadBlock"><label>🖼️ Logo firmy</label><div class="logoActions"><button class="logoAction" type="button" id="haveLogoBtn">Mam logo — wgram plik</button><button class="logoAction primary" type="button" id="needLogoBtn">✨ Nie mam logo — stwórz propozycje</button></div><input id="logoInput" type="file" accept="image/*" style="display:none"><div class="thumbs" id="logoThumb"></div><div class="logoIdeas" id="logoIdeas"></div><div class="fileHelp">Logo możesz zmieniać także później w panelu demo.</div></div>
        <div class="uploadBlock"><label>📷 Zdjęcia realizacji / firmy (opcjonalnie)</label><input id="photoInput" type="file" accept="image/*" multiple><div class="uploadStatus" id="photoStatus"></div><div class="thumbs" id="thumbs"></div></div>
        ${chat.data.projectsEnabled?`<div class="uploadBlock"><label>📐 Projekty / wizualizacje (opcjonalnie)</label><input id="projectInput" type="file" accept="image/*" multiple><div class="uploadStatus" id="projectStatus"></div><div class="thumbs" id="projectThumbs"></div><div class="fileHelp">Te materiały pojawią się w osobnej sekcji „Projekty”, a nie w realizacjach.</div></div>`:''}
        <button class="genbtn" type="button" id="generateBtn">✨ Wygeneruj profesjonalne demo</button>`;
      msgs.appendChild(wrap);msgs.scrollTop=msgs.scrollHeight;
      const genBtn=wrap.querySelector('#generateBtn'),logoInput=wrap.querySelector('#logoInput'),photoInput=wrap.querySelector('#photoInput'),status=wrap.querySelector('#photoStatus'),ideas=wrap.querySelector('#logoIdeas'),logoThumb=wrap.querySelector('#logoThumb');
      wrap.querySelector('#haveLogoBtn').onclick=()=>logoInput.click();wrap.querySelector('#needLogoBtn').onclick=()=>{chat.data.logoMode='generated';renderLogoIdeas(ideas,true);ai('Przygotowałem propozycje logo. Możesz wybrać jedną teraz albo później generować kolejne w edycji demo.')};
      logoInput.addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{genBtn.disabled=true;genBtn.textContent='Przetwarzam logo…';chat.data.logo=await imageFileToDataURL(file,900,.9);chat.data.logoMode='uploaded';logoThumb.innerHTML=`<img src="${chat.data.logo}" alt="Logo">`;ideas.innerHTML=''}catch(err){ai('Nie udało się odczytać logo. Spróbuj JPG lub PNG.')}finally{genBtn.disabled=false;genBtn.textContent='✨ Wygeneruj profesjonalne demo'}});
      photoInput.addEventListener('change',e=>processImageInput(e,chat.data,'photos',wrap.querySelector('#thumbs'),status,genBtn));
      const projectInput=wrap.querySelector('#projectInput');if(projectInput)projectInput.addEventListener('change',e=>processImageInput(e,chat.data,'projectPhotos',wrap.querySelector('#projectThumbs'),wrap.querySelector('#projectStatus'),genBtn));
      const runGenerate=()=>{if(genBtn.disabled)return;genBtn.textContent='✨ Otwieram podgląd…';requestAnimationFrame(()=>{generateDemo();genBtn.textContent='✨ Wygeneruj profesjonalne demo'})};genBtn.addEventListener('click',runGenerate);genBtn.addEventListener('touchend',e=>{e.preventDefault();runGenerate()},{passive:false});
      ai('Gotowe. Teraz możesz dodać materiały. Realizacje i projekty są rozdzielone, więc strona będzie wyglądała bardziej profesjonalnie.');
    }
    async function processImageInput(e,data,key,thumbs,status,genBtn){const files=[...(e.target.files||[])].slice(0,10);thumbs.innerHTML='';if(!files.length){data[key]=[];status.textContent='';return}genBtn.disabled=true;genBtn.textContent='Przetwarzam zdjęcia…';const result=[];try{for(let i=0;i<files.length;i++){status.textContent=`Przetwarzam ${i+1} z ${files.length}…`;const src=await imageFileToDataURL(files[i],1800,.84);result.push(src);const img=document.createElement('img');img.src=src;thumbs.appendChild(img);await new Promise(r=>setTimeout(r,0))}data[key]=result;status.textContent=`✓ Gotowe — dodano ${result.length} plików.`}catch(err){status.textContent='Nie udało się przetworzyć któregoś pliku. Spróbuj dodać mniej zdjęć.'}finally{genBtn.disabled=false;genBtn.textContent='✨ Wygeneruj profesjonalne demo'}}

    function fileToDataURL(file){return imageFileToDataURL(file,1600,.84)}
    function imageFileToDataURL(file,maxSide=1600,quality=.84){
      return new Promise((resolve,reject)=>{
        if(!file||!file.type||!file.type.startsWith('image/')){reject(new Error('not-image'));return}
        const reader=new FileReader();
        reader.onerror=()=>reject(reader.error||new Error('read-error'));
        reader.onload=()=>{
          const img=new Image();
          img.onerror=()=>resolve(reader.result);
          img.onload=()=>{
            try{
              const scale=Math.min(1,maxSide/Math.max(img.naturalWidth||1,img.naturalHeight||1));
              const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
              const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
              const ctx=canvas.getContext('2d',{alpha:false});
              ctx.drawImage(img,0,0,w,h);
              resolve(canvas.toDataURL('image/jpeg',quality));
            }catch(e){resolve(reader.result)}
          };
          img.src=reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function logoSvgData(company,industry,variant=0,seed=0){
      const name=(company||'Twoja Firma').trim();
      const letters=initials(name)||'BF';
      const palette=[['#f5b800','#111820'],['#111820','#f5b800'],['#194b6a','#d9f3ff'],['#2b174d','#f3deff'],['#123f35','#d9fff4']];
      const [a,b]=palette[(variant+seed)%palette.length];
      const safe=(s)=>String(s).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&apos;'}[m]));
      const label=safe(name.split(/\s+/).slice(0,2).join(' '));
      let art='';
      if(variant%4===0)art=`<rect x="14" y="14" width="132" height="132" rx="34" fill="${a}"/><text x="80" y="98" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="900" fill="${b}">${safe(letters)}</text>`;
      if(variant%4===1)art=`<circle cx="80" cy="80" r="66" fill="${b}"/><path d="M42 91 L80 39 L118 91 L96 91 L80 70 L64 91 Z" fill="${a}"/><text x="80" y="128" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="${a}">${safe(letters)}</text>`;
      if(variant%4===2)art=`<rect x="14" y="14" width="132" height="132" rx="24" fill="${b}"/><path d="M42 52h76v18H42zM42 79h58v18H42zM42 106h76v18H42z" fill="${a}"/>`;
      if(variant%4===3)art=`<rect x="14" y="14" width="132" height="132" rx="66" fill="${a}"/><text x="80" y="92" text-anchor="middle" font-family="Georgia,serif" font-size="54" font-weight="700" fill="${b}">${safe(letters.charAt(0))}</text>`;
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="36" fill="#ffffff"/>${art}</svg>`;
      return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
    }
    function createLogoOptions(){const seed=chat.data.logoSeed||0;return [0,1,2,3].map(v=>logoSvgData(chat.data.company,chat.data.industry,v,seed))}
    function selectLogo(src,container){chat.data.logo=src;chat.data.logoMode='generated';if(container)container.querySelectorAll('.logoIdea').forEach(el=>el.classList.toggle('active',el.dataset.src===src));if(overlay.classList.contains('show'))renderDemo(false)}
    function renderLogoIdeas(container,newBatch=false){if(!container)return;if(newBatch)chat.data.logoSeed=(chat.data.logoSeed||0)+1;const options=createLogoOptions();container.innerHTML='';options.forEach((src,i)=>{const b=document.createElement('button');b.type='button';b.className='logoIdea'+(chat.data.logo===src?' active':'');b.dataset.src=src;b.innerHTML=`<img src="${src}" alt="Propozycja logo ${i+1}">`;b.onclick=()=>selectLogo(src,container);container.appendChild(b)});if(!chat.data.logo){selectLogo(options[0],container)}}

    function themeClass(style=''){const s=style.toLowerCase();if(s.includes('jasna'))return 'theme-light';if(s.includes('sport'))return 'theme-sport';if(s.includes('elegancka'))return 'theme-elegant';return 'theme-dark'}
    function hashString(str=''){let h=0;for(let i=0;i<str.length;i++)h=((h<<5)-h)+str.charCodeAt(i)|0;return Math.abs(h)}
    function layoutClass(d){const n=hashString((d.company||'')+'|'+(d.industry||'')+'|'+(d.style||''))%3;return ['layout-split','layout-editorial','layout-showcase'][n]}
    
    
    
    
    
    
    
    
    function siteCopy(d){
  const cat=categoryKey(d), n=hashString(`${d.company||''}|${d.city||''}|sections`)%3;
  const common=(a,b,c,d1,e,f)=>[{servicesTitle:a,servicesLead:b,ctaTitle:c,ctaLead:d1,contactTitle:e,contactLead:f}];
  const packs={
    cartrade:[{servicesTitle:'Import auta krok po kroku',servicesLead:'Od określenia budżetu po sprowadzenie i odbiór samochodu.',ctaTitle:'Szukasz konkretnego auta?',ctaLead:'Napisz model, budżet i najważniejsze wymagania.',contactTitle:'Zacznijmy od auta, którego szukasz',contactLead:'Kilka informacji wystarczy, żeby rozpocząć rozmowę.'},{servicesTitle:'Samochód dobrany do Ciebie',servicesLead:'Najpierw wymagania, potem konkretne oferty.',ctaTitle:'Chcesz sprowadzić auto?',ctaLead:'Powiedz czego szukasz i jaki masz budżet.',contactTitle:'Porozmawiajmy o imporcie',contactLead:'Zostaw kontakt i podstawowe wymagania.'},{servicesTitle:'Od wyboru do odbioru',servicesLead:'Jasne etapy importu i jeden kontakt przez cały proces.',ctaTitle:'Masz już wybrany model?',ctaLead:'Sprawdźmy, jak podejść do zakupu.',contactTitle:'Sprawdź możliwości',contactLead:'Napisz, jakiego samochodu szukasz.'}],
    childcare:[{servicesTitle:'Opieka dopasowana do rytmu rodziny',servicesLead:'Bezpieczne warunki, uważna opieka i jasne zasady dla rodziców.',ctaTitle:'Szukasz opieki dla dziecka?',ctaLead:'Napisz wiek dziecka i godziny, w których potrzebujesz wsparcia.',contactTitle:'Zapytaj o dostępność',contactLead:'Zostaw kontakt i krótko opisz swoje potrzeby.'},{servicesTitle:'Spokojniejszy dzień rodzica',servicesLead:'Opieka w czasie pracy i obowiązków, z dobrym kontaktem z rodzicem.',ctaTitle:'Sprawdź wolne miejsca',ctaLead:'Podaj dni, godziny i wiek dziecka.',contactTitle:'Porozmawiajmy o opiece',contactLead:'Kilka informacji wystarczy na start.'},{servicesTitle:'Dobre miejsce dla małych ludzi',servicesLead:'Codzienna opieka i aktywności dopasowane do wieku dzieci.',ctaTitle:'Chcesz poznać warunki?',ctaLead:'Napisz, jakiej opieki potrzebujesz.',contactTitle:'Zapytaj o opiekę',contactLead:'Odpowiemy konkretnie o dostępności i organizacji.'}],
    greenhouse:[{servicesTitle:'Szklarnia dopasowana do Twojego ogrodu',servicesLead:'Konstrukcja, poliwęglan i montaż dobrane do przestrzeni.',ctaTitle:'Masz miejsce na szklarnię?',ctaLead:'Podaj wymiary i oczekiwany rozmiar.',contactTitle:'Wyceń swoją szklarnię',contactLead:'Napisz, jakiej wielkości szklarni potrzebujesz.'},{servicesTitle:'Od konstrukcji do gotowej szklarni',servicesLead:'Całość z montażem albo zestaw do samodzielnego skręcenia.',ctaTitle:'Chcesz wydłużyć sezon?',ctaLead:'Powiedz, ile masz miejsca i co chcesz uprawiać.',contactTitle:'Porozmawiajmy o szklarni',contactLead:'Kilka wymiarów wystarczy na start.'},{servicesTitle:'Szklarnie z poliwęglanu bez komplikacji',servicesLead:'Trwała konstrukcja i praktyczny układ.',ctaTitle:'Sprawdź odpowiedni wariant',ctaLead:'Napisz rozmiar i sposób montażu.',contactTitle:'Poproś o wycenę',contactLead:'Zostaw kontakt i podstawowe wymiary.'}],
    gates:[{servicesTitle:'Co zrobimy dla Twojego wjazdu',servicesLead:'Pomiar, wykonanie i montaż pod konkretną posesję.',ctaTitle:'Masz pomysł na bramę?',ctaLead:'Pokaż wjazd lub podaj wymiary.',contactTitle:'Wyceńmy Twoją bramę',contactLead:'Dopytamy tylko o rzeczy potrzebne do wyceny.'},{servicesTitle:'Od pomiaru do montażu',servicesLead:'Ty pokazujesz potrzebę. My dobieramy wykonanie.',ctaTitle:'Zacznij od krótkiej rozmowy',ctaLead:'Najpierw ustalamy, co ma sens.',contactTitle:'Porozmawiajmy o wjeździe',contactLead:'Numer telefonu i krótki opis wystarczą.'},{servicesTitle:'Bramy i ogrodzenia pod wymiar',servicesLead:'Rozwiązanie dopasowane do posesji.',ctaTitle:'Chcesz poznać koszt?',ctaLead:'Podeślij podstawowe informacje.',contactTitle:'Poproś o wycenę',contactLead:'Napisz, czego potrzebujesz.'}],
    auto:[{servicesTitle:'Wybierz efekt, nie pakiet',servicesLead:'Dobieramy usługę do stanu auta i oczekiwanego efektu.',ctaTitle:'Chcesz odświeżyć auto?',ctaLead:'Napisz model i oczekiwany efekt.',contactTitle:'Dobierzmy usługę',contactLead:'Zostaw kontakt i model auta.'}],
    dental:[{servicesTitle:'Zadbaj o zdrowy uśmiech',servicesLead:'Profilaktyka, leczenie i higienizacja w spokojnej formule.',ctaTitle:'Chcesz umówić wizytę?',ctaLead:'Napisz, czego potrzebujesz.',contactTitle:'Umów wizytę',contactLead:'Zostaw kontakt i krótko napisz, z czym się zgłaszasz.'}],
    beauty:[{servicesTitle:'Usługi dopasowane do efektu',servicesLead:'Wybierz usługę i termin, który Ci odpowiada.',ctaTitle:'Masz ochotę na zmianę?',ctaLead:'Napisz, jaki efekt chcesz osiągnąć.',contactTitle:'Umów wizytę',contactLead:'Zostaw kontakt i wybierz usługę.'}],
    build:[{servicesTitle:'Od ustaleń do gotowego efektu',servicesLead:'Jasny zakres prac i konkretne etapy realizacji.',ctaTitle:'Planujesz remont lub realizację?',ctaLead:'Opisz zakres i lokalizację.',contactTitle:'Porozmawiajmy o pracach',contactLead:'Zostaw kontakt i krótki zakres.'}],
    transport:[{servicesTitle:'Transport bez zbędnych komplikacji',servicesLead:'Trasa, ładunek, termin i konkretna wycena.',ctaTitle:'Masz coś do przewiezienia?',ctaLead:'Podaj trasę, termin i rodzaj ładunku.',contactTitle:'Sprawdź termin i cenę',contactLead:'Zostaw dane do szybkiej wyceny.'}],
    plumbing:[{servicesTitle:'Instalacje i naprawy bez zgadywania',servicesLead:'Diagnoza problemu, jasny zakres i sprawne wykonanie.',ctaTitle:'Potrzebujesz hydraulika?',ctaLead:'Opisz problem lub planowaną instalację.',contactTitle:'Umów kontakt',contactLead:'Napisz, czego potrzebujesz i gdzie.'}],
    electrical:[{servicesTitle:'Elektryka wykonana jasno i bezpiecznie',servicesLead:'Od drobnych napraw po instalacje i rozdzielnie.',ctaTitle:'Masz temat elektryczny?',ctaLead:'Opisz zakres i lokalizację.',contactTitle:'Zapytaj o termin',contactLead:'Zostaw kontakt i krótki opis.'}],
    hvac:[{servicesTitle:'Komfort przez cały rok',servicesLead:'Dobór, montaż i serwis klimatyzacji lub wentylacji.',ctaTitle:'Chcesz dobrać urządzenie?',ctaLead:'Napisz, jakie pomieszczenie chcesz obsłużyć.',contactTitle:'Umów konsultację',contactLead:'Zostaw kontakt i podstawowe informacje.'}],
    cleaning:[{servicesTitle:'Czysto bez tracenia czasu',servicesLead:'Zakres sprzątania dopasowany do domu, firmy lub zlecenia.',ctaTitle:'Potrzebujesz sprzątania?',ctaLead:'Podaj miejsce, zakres i termin.',contactTitle:'Sprawdź dostępność',contactLead:'Zostaw kontakt i krótki opis.'}],
    autoservice:[{servicesTitle:'Serwis bez niejasnych kosztów',servicesLead:'Najpierw diagnoza, potem uzgodniony zakres naprawy.',ctaTitle:'Auto wymaga serwisu?',ctaLead:'Napisz model i objawy.',contactTitle:'Umów diagnozę',contactLead:'Zostaw kontakt i opisz problem.'}],
    bicycle:[{servicesTitle:'Rower gotowy do jazdy',servicesLead:'Przegląd, naprawa i regulacja dopasowana do stanu roweru.',ctaTitle:'Co dzieje się z rowerem?',ctaLead:'Opisz problem lub wybierz usługę.',contactTitle:'Umów serwis',contactLead:'Zostaw kontakt i model roweru.'}],
    photo:[{servicesTitle:'Kadry dopasowane do okazji',servicesLead:'Sesja, styl i zakres ustalone przed zdjęciami.',ctaTitle:'Planujesz sesję?',ctaLead:'Napisz okazję, termin i miejsce.',contactTitle:'Sprawdź termin',contactLead:'Zostaw kontakt i krótki pomysł.'}],
    accounting:[{servicesTitle:'Księgowość bez zbędnego chaosu',servicesLead:'Jasny zakres obsługi i kontakt wtedy, kiedy go potrzebujesz.',ctaTitle:'Szukasz obsługi księgowej?',ctaLead:'Napisz rodzaj działalności i czego potrzebujesz.',contactTitle:'Umów rozmowę',contactLead:'Zostaw kontakt i podstawowe informacje.'}],
    pet:[{servicesTitle:'Dobra opieka nad Twoim pupilem',servicesLead:'Zakres usługi dopasowany do zwierzęcia i jego potrzeb.',ctaTitle:'Jak możemy pomóc Twojemu pupilowi?',ctaLead:'Napisz gatunek, potrzebę i termin.',contactTitle:'Zapytaj o termin',contactLead:'Zostaw kontakt i kilka informacji.'}],
    food:[{servicesTitle:'Smak, który ma swój charakter',servicesLead:'Oferta podana jasno, z naciskiem na to, po co klienci wracają.',ctaTitle:'Chcesz zarezerwować lub zamówić?',ctaLead:'Napisz, czego potrzebujesz.',contactTitle:'Skontaktuj się',contactLead:'Zostaw kontakt lub szczegóły zamówienia.'}],
    fitness:[{servicesTitle:'Trening dopasowany do celu',servicesLead:'Najpierw cel i możliwości, potem konkretny plan działania.',ctaTitle:'Chcesz zacząć trenować?',ctaLead:'Napisz cel i dostępność.',contactTitle:'Umów konsultację',contactLead:'Zostaw kontakt i swój główny cel.'}],
    general:[{servicesTitle:'Konkretnie o tym, co robimy',servicesLead:'Oferta opisana tak, żeby klient szybko wiedział, czy trafił dobrze.',ctaTitle:'Masz pytanie?',ctaLead:'Napisz, czego potrzebujesz.',contactTitle:'Zostaw kontakt',contactLead:'Wrócimy z konkretną odpowiedzią.'}]
  };
  const list=packs[cat]||packs.general;return list[n%list.length]
}
    function initials(name='Firma'){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'F'}
    function slugify(s=''){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'').slice(0,28)||'twojafirma'}
    function domainIdeas(d){const base=slugify(d.company);const city=slugify(d.city);return [...new Set([`${base}.pl`,city?`${base}-${city}.pl`:null,`${base}24.pl`].filter(Boolean))]}
    function photoCaption(d,i){const services=normalizeServices(d.services||'');const label=services[i%Math.max(services.length,1)]||'Realizacja';return `${label} • ${d.city||d.company||'realizacja'}`}

    // ===== BeeFlow v11.1: bezpieczniejsza analiza branży + nazewnictwo =====
    function businessContext(d=chat.data){return [d.businessBrief,d.industry,d.services,d.usp].filter(Boolean).join(' ').toLowerCase()}
    function deriveIndustryLabel(text='',manual=false){
  const detected=detectIndustry(text);
  if(detected.confidence>0)return detected.label;
  return manual?manualIndustryLabel(text):''
}
    function industryLabel(industry=''){return deriveIndustryLabel(industry)}
    function businessFeatures(d=chat.data){
      const x=businessContext(d), f=[];
      const add=v=>{if(v&&!f.includes(v))f.push(v)};
      if(/własna produk|wlasna produk|od zera|produkuj/.test(x))add('Własna produkcja');
      if(/pomiar|mierzymy|wymiar/.test(x))add('Pomiar i wykonanie pod wymiar');
      if(/projekt|wizual|pomysł klienta|pomysl klienta/.test(x))add('Projekt dopasowany do pomysłu klienta');
      if(/montaż|montaz|montujemy/.test(x))add('Montaż gotowej realizacji');
      if(/malow|lakier|proszk/.test(x))add('Wykończenie i zabezpieczenie');
      if(/transport|dowóz|dowoz|dostaw/.test(x))add('Transport gotowych elementów');
      if(/6 metr|6-met|sztang stal/.test(x))add('Produkcja z pełnych profili stalowych');
      if(/szybk|termin/.test(x))add('Sprawny termin realizacji');
      if(/indywidual|pod klient/.test(x))add('Indywidualne podejście');
      return f.slice(0,5)
    }
    function cleanUsp(usp=''){
      const x=String(usp).trim(); if(!x||/^(pomiń|brak)$/i.test(x))return '';
      const low=x.toLowerCase();
      if(/własna produk|wlasna produk/.test(low))return 'Własna produkcja od konstrukcji po gotowy wyrób';
      if(/pomiar|wymiar/.test(low))return 'Wykonanie dokładnie pod wymiar';
      if(/projekt|wizual/.test(low))return 'Projekt dopasowany do pomysłu klienta';
      if(/kontakt/.test(low))return 'Bezpośredni kontakt na każdym etapie';
      if(/termin/.test(low))return 'Terminowe i jasno ustalone realizacje';
      return 'Indywidualne wykonanie dopasowane do zlecenia';
    }
    function categoryKey(d=chat.data){
  const detected=detectIndustry(businessContext(d));
  return detected.key||'general'
}
    function areaCopy(d){return d.city?`${d.city} + okolice`:'Lokalnie i w okolicy'}
    function pickCopy(d,list,salt=''){return list[hashString(`${d.company||''}|${d.industry||''}|${d.city||''}|${salt}`)%list.length]}
    function heroTitle(d){
  if((d.headline||'').trim())return d.headline.trim();
  const cat=categoryKey(d),variants={
    cartrade:['Auta z importu. Bez zgadywania.','Znajdź auto, które naprawdę ma sens.','Import samochodów z konkretnym planem.'],
    childcare:['Dobra opieka, kiedy Ty jesteś w pracy.','Bezpieczna opieka. Spokojniejszy dzień rodzica.','Miejsce, w którym dzieci czują się swobodnie.'],
    greenhouse:['Szklarnia dopasowana do Twojego ogrodu.','Więcej sezonu. Więcej zbiorów.','Solidna konstrukcja. Jasny montaż.'],
    gates:['Brama na wymiar. Bez kompromisów.','Od pomiaru do gotowej bramy.','Twój wjazd. Nasza stal. Gotowy efekt.'],
    auto:['Auto, które znów robi wrażenie.','Efekt widać od pierwszego spojrzenia.','Czysto. Głęboko. Zabezpieczone.'],
    dental:['Zdrowy uśmiech zaczyna się od dobrej diagnostyki.','Spokojna wizyta. Jasny plan leczenia.','Stomatologia bez zbędnego stresu.'],
    build:['Konkretny zakres. Porządne wykonanie.','Od planu do gotowego efektu.','Remont bez chaosu i niedomówień.'],
    beauty:['Efekt, po który chce się wracać.','Twój czas. Twój efekt.','Profesjonalnie, ale bez sztywnej atmosfery.'],
    transport:['Dowozimy. Na czas. Bez komplikacji.','Transport, który po prostu działa.','Trasa ustalona. Termin dotrzymany.'],
    plumbing:['Hydraulika bez zgadywania i niespodzianek.','Sprawna instalacja. Szybka pomoc.','Problem z wodą? Zacznijmy od diagnozy.'],
    electrical:['Elektryka zrobiona bezpiecznie i konkretnie.','Od gniazdka po całą instalację.','Dobry prąd zaczyna się od dobrej instalacji.'],
    hvac:['Komfortowa temperatura przez cały rok.','Klimatyzacja dobrana do Twojej przestrzeni.','Świeże powietrze. Dobry komfort.'],
    cleaning:['Czystość, którą naprawdę widać.','Mniej sprzątania. Więcej czasu dla Ciebie.','Porządek bez tracenia dnia.'],
    autoservice:['Diagnoza najpierw. Naprawa później.','Serwis auta bez niejasnych kosztów.','Twoje auto znów ma działać jak trzeba.'],
    bicycle:['Rower gotowy na kolejną trasę.','Serwis, regulacja i spokojna jazda.','Naprawiamy. Regulujemy. Jedziesz dalej.'],
    photo:['Zdjęcia, do których chce się wracać.','Dobry kadr zaczyna się od dobrej historii.','Twoja historia w dobrym świetle.'],
    accounting:['Księgowość bez zbędnego chaosu.','Dokumenty pod kontrolą. Ty prowadzisz firmę.','Jasne liczby. Spokojniejszy biznes.'],
    pet:['Dobra opieka dla Twojego pupila.','Twój pupil w dobrych rękach.','Usługa dopasowana do zwierzaka.'],
    food:['Smak, po który chce się wracać.','Dobre jedzenie. Prosty wybór.','Tu zaczyna się apetyt.'],
    fitness:['Trening z planem, nie przypadkiem.','Twój cel. Dobry plan. Regularny progres.','Forma budowana krok po kroku.'],
    general:[`${d.company||'Twoja firma'}. Konkret zamiast obietnic.`,`${d.company||'Twoja firma'} — dobry efekt zaczyna się od dobrych ustaleń.`,`Usługa dopasowana do Ciebie, nie odwrotnie.`]
  };return pickCopy(d,variants[cat]||variants.general,'hero')
}
    function heroLead(d){
  const cat=categoryKey(d),area=areaCopy(d),m={
    cartrade:`Pomagamy znaleźć i sprowadzić samochód zgodnie z budżetem i wymaganiami. ${area}.`,
    childcare:`Zapewniamy dzieciom bezpieczną, uważną opiekę, kiedy rodzice są w pracy lub mają inne obowiązki. ${area}.`,
    greenhouse:`Szklarnie z poliwęglanu przygotowane pod konkretny ogród i sposób użytkowania. ${area}.`,
    gates:`Pomiar, wykonanie i montaż pod konkretny wjazd. ${area}.`,
    auto:`Dobieramy usługę do stanu auta i efektu, którego oczekujesz. ${area}.`,
    dental:`Diagnoza, jasne wyjaśnienie możliwości i leczenie dopasowane do potrzeb pacjenta. ${area}.`,
    beauty:`Wybierasz efekt. My dobieramy usługę i dogodny termin. ${area}.`,
    build:`Najpierw zakres i wycena. Potem sprawna realizacja. ${area}.`,
    transport:`Podajesz trasę i ładunek. My ustalamy termin i konkretną cenę. ${area}.`,
    plumbing:`Naprawy i instalacje z jasno ustalonym zakresem. ${area}.`,
    electrical:`Instalacje i naprawy elektryczne z naciskiem na bezpieczeństwo. ${area}.`,
    hvac:`Dobór, montaż i serwis urządzeń dopasowanych do pomieszczenia. ${area}.`,
    cleaning:`Sprzątanie dopasowane do miejsca, zakresu i terminu. ${area}.`,
    autoservice:`Najpierw ustalamy problem, potem zakres naprawy. ${area}.`,
    bicycle:`Serwis i regulacja dopasowane do stanu roweru. ${area}.`,
    photo:`Sesje dopasowane do okazji, miejsca i efektu, którego oczekujesz. ${area}.`,
    accounting:`Obsługa księgowa dopasowana do rodzaju działalności. ${area}.`,
    pet:`Zakres usługi dopasowany do zwierzęcia i jego potrzeb. ${area}.`,
    food:`Oferta podana jasno, z naciskiem na jakość i wygodny kontakt. ${area}.`,
    fitness:`Trening dopasowany do celu, możliwości i rytmu dnia. ${area}.`
  };return m[cat]||`Krótka rozmowa, jasny zakres i konkretny kolejny krok. ${area}.`
}
    function serviceDesc(name,industry=''){
  const n=intentText(name),ctx=intentText(name+' '+industry),cat=detectIndustry(ctx).key;
  if(cat==='childcare')return 'Zakres opieki dopasowujemy do wieku dziecka, godzin i potrzeb rodziny, z jasnym kontaktem z rodzicem.';
  if(cat==='cartrade'&&/(import|sprowadz)/.test(n))return 'Szukamy i sprowadzamy samochód zgodnie z budżetem, wymaganiami i ustalonym procesem.';
  if(cat==='cartrade')return 'Pomagamy przejść przez kolejne etapy wyboru i zakupu samochodu bez przypadkowych decyzji.';
  if(cat==='greenhouse')return 'Rozwiązanie dobieramy do wymiaru, sposobu użytkowania i oczekiwanego wariantu montażu.';
  if(cat==='dental')return 'Zakres wizyty dobieramy do potrzeb pacjenta i jasno omawiamy kolejne kroki.';
  if(cat==='beauty')return 'Usługę i efekt dobieramy do Twoich oczekiwań, z naciskiem na estetykę i komfort.';
  if(cat==='plumbing')return 'Najpierw ustalamy problem lub zakres instalacji, potem proponujemy konkretny sposób wykonania.';
  if(cat==='electrical')return 'Zakres prac dobieramy do instalacji i potrzeb, z naciskiem na bezpieczne wykonanie.';
  if(cat==='hvac')return 'Dobieramy rozwiązanie do kubatury, sposobu użytkowania i oczekiwanego komfortu.';
  if(cat==='cleaning')return 'Zakres sprzątania ustalamy do miejsca, stopnia zabrudzenia i oczekiwanego terminu.';
  if(cat==='autoservice')return 'Najpierw diagnoza i zakres, potem uzgodniona naprawa bez niepotrzebnych niespodzianek.';
  if(cat==='bicycle')return 'Sprawdzamy rower, ustalamy zakres i wykonujemy serwis potrzebny do bezpiecznej jazdy.';
  if(cat==='photo')return 'Zakres sesji dopasowujemy do okazji, miejsca, stylu i oczekiwanego efektu.';
  if(cat==='accounting')return 'Zakres obsługi dopasowujemy do formy działalności i potrzeb przedsiębiorcy.';
  if(cat==='pet')return 'Usługę dopasowujemy do zwierzęcia, jego charakteru i konkretnej potrzeby.';
  if(cat==='food')return 'Oferta opisana jasno, żeby klient szybko wiedział, czego może się spodziewać.';
  if(cat==='fitness')return 'Plan dopasowujemy do celu, poziomu startowego i realnej dostępności na treningi.';
  if(/bram.*przesuw|przesuw.*bram/.test(ctx))return 'Dobieramy skrzydło, przeciwwagę i prowadzenie dokładnie do Twojego wjazdu.';
  if(cat==='gates')return 'Konstrukcję i wykonanie dopasowujemy do wymiaru, posesji i sposobu użytkowania.';
  if(cat==='auto')return 'Zakres usługi dobieramy do stanu auta i efektu, który chcesz osiągnąć.';
  if(cat==='build')return 'Zakres prac ustalamy przed startem, żeby kolejne etapy były jasne i przewidywalne.';
  if(cat==='transport')return 'Ustalamy trasę, rodzaj ładunku i termin, a potem podajemy konkretny kolejny krok.';
  return 'Zakres usługi ustalamy indywidualnie, żeby klient od początku wiedział, co obejmuje realizacja.'
}
    function aboutCopy(d){
      const cat=categoryKey(d), f=businessFeatures(d), area=areaCopy(d), name=d.company||'Nasza firma';
      if(cat==='cartrade')return `${name} zajmuje się importem i sprzedażą samochodów. Pomagamy przejść od wyboru auta do jego sprowadzenia i przygotowania do odbioru. ${area}.`;
      if(cat==='greenhouse')return `${name} wykonuje szklarnie ogrodowe z poliwęglanu — od przygotowania konstrukcji po gotowy zestaw lub montaż. ${area}.`;
      if(cat==='gates'){
        const own=f.includes('Własna produkcja')?' Własna produkcja daje nam kontrolę nad każdym etapem.':'';
        return `${name} tworzy bramy i ogrodzenia na wymiar — od pomiaru po montaż.${own} ${area}.`;
      }
      if(cat==='auto')return `${name} dba o wygląd i zabezpieczenie aut. Dobieramy zakres do stanu samochodu, a nie do gotowego pakietu. ${area}.`;
      if(cat==='dental')return `${name} zapewnia opiekę stomatologiczną z naciskiem na spokojną atmosferę, zrozumiałe wyjaśnienie leczenia i indywidualne podejście do pacjenta. ${area}.`;
      if(cat==='beauty')return `${name} to miejsce, w którym liczy się estetyka, higiena i efekt dopasowany do Ciebie. Każdą wizytę zaczynamy od krótkiego ustalenia oczekiwań. ${area}.`;
      if(cat==='childcare')return `${name} zapewnia opiekę nad dziećmi w czasie, gdy rodzice są w pracy lub mają inne obowiązki. Stawiamy na bezpieczeństwo, dobrą komunikację z rodzicem i spokojną atmosferę dla dziecka. ${area}.`;
      if(cat==='build')return `${name} realizuje prace według ustalonego zakresu. Bez niedomówień, z jasnym kontaktem na każdym etapie. ${area}.`;
      if(cat==='transport')return `${name} organizuje przewóz sprawnie i konkretnie — trasa, termin i warunki są jasne od początku. ${area}.`;
      return `${name} stawia na jasne ustalenia, dobry kontakt i rozwiązania dopasowane do konkretnego zlecenia. ${area}.`
    }
    function trustItems(d){
      const cat=categoryKey(d), f=businessFeatures(d), area=areaCopy(d);
      if(cat==='cartrade')return [['Dobór auta','Szukamy samochodu pod budżet i konkretne wymagania'],['Jasny proces','Wiesz, co dzieje się na każdym etapie importu'],['Kontakt','Masz jedno miejsce do ustaleń od początku do odbioru']];
      if(cat==='greenhouse')return [['Dopasowanie do ogrodu','Rozmiar i konstrukcja pod konkretną przestrzeń'],['Poliwęglan i konstrukcja','Materiały dobrane do codziennego użytkowania'],['Elastyczny montaż','Montaż przez nas lub przygotowanie zestawu do samodzielnego skręcenia']];
      if(cat==='gates')return [[f.includes('Pomiar i wykonanie pod wymiar')?'Pod wymiar':'Dopasowanie','Nie z katalogu — pod konkretny wjazd'],[f.includes('Własna produkcja')?'Własna produkcja':'Pewny proces','Kontrola od stali do montażu'],['Lokalnie',area]];
      if(cat==='auto')return [['Dobór zakresu','Tylko to, czego auto naprawdę potrzebuje'],['Detal','Efekt widać z bliska'],['Termin','Szybkie i jasne ustalenie']];
      if(cat==='dental')return [['Spokojne podejście','Jasno tłumaczymy kolejne etapy'],['Plan leczenia','Wiesz, jakie są możliwości i co robimy dalej'],['Lokalnie',area]];
      if(cat==='beauty')return [['Higiena','Czyste stanowisko i bezpieczne narzędzia'],['Dobór efektu','Stylizacja dopasowana do Ciebie'],['Wizyta','Jasne ustalenie usługi i terminu']];
      if(cat==='childcare')return [['Bezpieczeństwo','Opieka dopasowana do wieku i potrzeb dziecka'],['Kontakt z rodzicem','Jasne ustalenia dotyczące dnia i opieki'],['Spokojna atmosfera','Miejsce, w którym dziecko może czuć się swobodnie']];
      return [['Jasny zakres','Wiesz, co obejmuje usługa'],['Dobry kontakt','Bez gonienia za odpowiedzią'],['Lokalnie',area]]
    }
    function whyCards(d){
      const f=businessFeatures(d), cat=categoryKey(d), cards=[];
      if(cat==='cartrade')return [['Auto pod wymagania','Nie zaczynamy od przypadkowej oferty — najpierw ustalamy, czego szukasz.'],['Weryfikacja przed zakupem','Sprawdzamy kluczowe informacje przed podjęciem decyzji.'],['Jasne etapy','Od wyboru auta po odbiór wiesz, co dzieje się dalej.'],['Kontakt w jednym miejscu','Nie musisz samodzielnie składać całego procesu z kilku usług.']];
      if(cat==='dental')return [['Spokojna wizyta','Dbamy o komfort i jasną komunikację od pierwszego kontaktu.'],['Zrozumiały plan','Wyjaśniamy możliwe rozwiązania i kolejne kroki leczenia.'],['Nowoczesne podejście','Diagnostykę i leczenie dobieramy do konkretnej sytuacji.'],['Profilaktyka','Pomagamy dbać o zdrowie jamy ustnej również między wizytami.']];
      if(cat==='beauty')return [['Indywidualny efekt','Najpierw ustalamy, jaki rezultat chcesz uzyskać.'],['Higiena','Dbamy o czystość stanowiska i bezpieczne przygotowanie narzędzi.'],['Spokojna atmosfera','Wizyta ma być przyjemna, nie pośpieszna.'],['Estetyka','Liczy się dopracowany efekt, który pasuje do Ciebie.']];
      if(cat==='greenhouse')return [['Dopasowana konstrukcja','Rozmiar i układ dobieramy do konkretnego ogrodu.'],['Poliwęglan','Lekka i praktyczna osłona do wydłużenia sezonu.'],['Opcja samodzielnego montażu','Możemy przygotować komplet elementów do skręcenia przez klienta.'],['Wsparcie po zakupie','Pomagamy również przy konserwacji i dalszej eksploatacji.']];
      if(cat==='childcare')return [['Bezpieczna opieka','Najważniejsze jest dobre samopoczucie i bezpieczeństwo dziecka.'],['Kontakt z rodzicem','Ustalamy najważniejsze informacje i pozostajemy w kontakcie.'],['Aktywności dla dzieci','Organizujemy czas odpowiednio do wieku i potrzeb.'],['Elastyczne ustalenia','Zakres i godziny opieki ustalamy przed rozpoczęciem.']];
      if(f.includes('Własna produkcja'))cards.push(['Własna produkcja','Kontrolujemy wykonanie od pierwszego cięcia.']);
      if(f.includes('Pomiar i wykonanie pod wymiar'))cards.push(['Pomiar na miejscu','Mierzymy przed produkcją, żeby wszystko pasowało.']);
      if(f.includes('Projekt dopasowany do pomysłu klienta'))cards.push(['Projekt pod klienta','Twój pomysł dopasowujemy do realnych warunków.']);
      if(f.includes('Montaż gotowej realizacji'))cards.push(['Montaż i regulacja','Oddajemy gotową, ustawioną konstrukcję.']);
      if(cat==='gates'&&cards.length<4)cards.push(['Dobór konstrukcji','Profile i wzmocnienia dobieramy do konkretnej bramy.']);
      while(cards.length<4){const defaults=[['Czytelna wycena','Najpierw zakres, potem konkretna cena.'],['Dobry kontakt','Wiesz, co dzieje się dalej.'],['Pod Twoje zlecenie','Nie wciskamy jednego rozwiązania każdemu.'],['Sprawdzone przed odbiorem','Kończymy dopiero, gdy wszystko działa jak trzeba.']];const n=defaults.find(x=>!cards.some(c=>c[0]===x[0]));if(!n)break;cards.push(n)}
      return cards.slice(0,4)
    }

    // Chat v12: opis firmy jest materiałem roboczym, a nie tekstem do wklejenia 1:1.
    function fieldLabel(key){return ({company:'nazwa firmy',businessBrief:'opis firmy do analizy',industry:'branża / kategoria',city:'obszar działania',services:'usługi',style:'styl strony',usp:'wyróżnik firmy',phone:'telefon',email:'e-mail'})[key]||key}
    function commitPending(){
  const key=chat.pendingKey,value=chat.pendingValue;
  if(key==='businessBrief'){
    chat.data.businessBrief=value;chat.data.industry='';chat.industryConfirmed=false
  }else if(key==='industry'){
    chat.data.industry=deriveIndustryLabel(value,true);chat.industryConfirmed=true
  }else chat.data[key]=value;
  chat.pendingKey=null;chat.pendingValue='';chat.phase='ask';
  const advancesCurrent=questions[chat.step]&&questions[chat.step].key===key;if(advancesCurrent)chat.step++;
  if(key==='company')chat.needsName=false;
  if(key==='businessBrief'){setTimeout(confirmDetectedIndustry,180);return}
  if(key==='industry'&&chat.needsName){setTimeout(offerNameSuggestion,180);return}
  if(chat.step>=questions.length){setTimeout(startExtras,180);return}
  setTimeout(askCurrent,180)
}
    function handleConfirmation(answerText){
  if(chat.phase!=='confirm')return;
  if(answerText==='yes'||isYes(answerText)){commitPending();return}
  chat.phase='ask';const key=chat.pendingKey;chat.pendingValue='';
  if(key==='company'){
    if(chat.needsName || !chat.data.businessBrief){
      chat.needsName=true;
      const briefIndex=questions.findIndex(q=>q.key==='businessBrief');
      if(briefIndex>=0)chat.step=briefIndex;
      ai('Jasne. Nie zapisuję tej nazwy. Najpierw poznam firmę, a potem zaproponuję kolejną nazwę dopasowaną do branży.');setTimeout(askCurrent,180);return
    }
    chat.nameRound++;offerNameSuggestion(true);return
  }
  ai(`Jasne. Poprawmy ${fieldLabel(key)}. Napisz właściwą wersję, a najpierw ją potwierdzę.`)
}
    function detectGlobalCorrection(t){
  if(isNoName(t))return false;
  const x=intentText(t);
  if(/(inna nazwa|inny pomysl|zmien nazwe|popraw nazwe|nazwa nie pasuje|nie podoba mi sie nazwa)/.test(x)){
    chat.nameRound++;offerNameSuggestion(true);return true
  }
  const wantsChange=/\b(zmien|popraw|zmodyfikuj|wroc)\b/.test(x);
  if(!wantsChange)return false;
  const map=[['miast','city'],['obszar','city'],['uslug','services'],['styl','style'],['telefon','phone'],['mail','email'],['email','email'],['wyrozn','usp'],['opis firm','businessBrief'],['branz','businessBrief']];
  for(const [needle,key] of map){if(x.includes(needle)){
    chat.phase='ask';chat.pendingKey=key;chat.pendingValue='';
    const idx=questions.findIndex(q=>q.key===key);if(idx>=0)chat.step=idx;
    ai(`Okej — wracamy do pola „${fieldLabel(key)}”. Podaj nową wersję.`);return true
  }}
  return false
}

    function actionLabel(d){const cat=categoryKey(d);if(cat==='dental'||cat==='beauty')return 'Umów wizytę';if(cat==='childcare')return 'Zapytaj o miejsce';if(cat==='auto'||cat==='autoservice'||cat==='bicycle'||cat==='pet')return 'Zapytaj o termin';if(cat==='transport')return 'Sprawdź termin i cenę';if(cat==='photo'||cat==='fitness'||cat==='accounting'||cat==='hvac')return 'Umów konsultację';if(cat==='food')return 'Skontaktuj się';return 'Poproś o wycenę'}
    function formTitleCopy(d){const cat=categoryKey(d);if(cat==='dental'||cat==='beauty')return 'Umów wizytę';if(cat==='childcare')return 'Zapytaj o opiekę i dostępność';if(cat==='auto'||cat==='autoservice'||cat==='bicycle'||cat==='pet')return 'Zapytaj o termin i zakres';if(cat==='photo'||cat==='fitness'||cat==='accounting'||cat==='hvac')return 'Umów konsultację';return 'Poproś o bezpłatną wycenę'}
    function formIntroCopy(d){const cat=categoryKey(d);if(cat==='dental')return 'Zostaw kontakt i krótko napisz, z czym się zgłaszasz.';if(cat==='beauty')return 'Zostaw kontakt i napisz, jaka usługa Cię interesuje.';if(cat==='childcare')return 'Zostaw kontakt i napisz, w jakich dniach lub godzinach potrzebujesz opieki.';if(cat==='autoservice'||cat==='bicycle')return 'Zostaw kontakt i krótko opisz problem.';if(cat==='photo')return 'Zostaw kontakt, termin i rodzaj sesji.';return 'Zostaw kontakt i krótko opisz, czego potrzebujesz.'}
    function messageLabelCopy(d){const cat=categoryKey(d);if(cat==='dental')return 'Z czym się zgłaszasz?';if(cat==='beauty')return 'Jaki efekt lub usługę wybierasz?';if(cat==='childcare')return 'Jakiej opieki potrzebujesz?';if(cat==='autoservice'||cat==='bicycle')return 'Co się dzieje?';if(cat==='photo')return 'Jaki rodzaj sesji planujesz?';return 'Krótki opis potrzeby'}
    function highlightClaim(d){const cat=categoryKey(d),f=businessFeatures(d);if(cat==='dental')return 'Spokojne podejście i jasny plan leczenia';if(cat==='beauty')return 'Higiena, estetyka i efekt dopasowany do Ciebie';if(cat==='childcare')return 'Bezpieczna opieka i dobry kontakt z rodzicem';return f[0]||cleanUsp(d.usp)||'Dobra realizacja zaczyna się od dobrych ustaleń.'}

    function renderDemo(save=false){
      const d=chat.data;const copy=siteCopy(d);const services=normalizeServices(d.services||'Profesjonalna obsługa, Indywidualna wycena, Szybka realizacja');const heroPhoto=d.photos[0]||d.projectPhotos[0]||'';const email=/pomiń/i.test(d.email||'')?'':d.email;const cls=themeClass(d.style);const layout=layoutClass(d);const domains=domainIdeas(d);const trust=trustItems(d);const why=whyCards(d);const extras=d.extras||[];
      const logo=d.logo?`<img class="demoLogo" src="${d.logo}" alt="Logo ${esc(d.company)}">`:`<span class="demoLogoFallback">${esc(initials(d.company))}</span>`;
      const gallery=d.photos.length?`<section class="demoSection alt" id="demo-realizacje"><div class="demoSectionTitleRow"><div><span class="demoEyebrow">Realizacje</span><h3>Zobacz wybrane realizacje</h3></div><div class="miniCopy">Kliknij zdjęcie — otworzy się pełnoekranowy pokaz slajdów dopasowany do telefonu, tabletu lub komputera.</div></div><div class="demoGallery">${d.photos.map((x,i)=>`<button type="button" class="demoGalleryItem" data-gallery-kind="realizations" data-gallery-index="${i}" aria-label="Powiększ realizację ${i+1}"><img src="${x}" alt="${esc(photoCaption(d,i))}"><span class="galleryZoomBadge">⛶ Powiększ</span></button>`).join('')}</div></section>`:'';
      const projects=d.projectPhotos.length?`<section class="demoSection" id="demo-projekty"><div class="demoSectionTitleRow"><div><span class="demoEyebrow">Projekty</span><h3>Projekty i wizualizacje</h3></div><div class="miniCopy">Koncepcje przed realizacją — klient może zobaczyć kierunek projektu jeszcze przed wykonaniem.</div></div><div class="projectGrid">${d.projectPhotos.map((x,i)=>`<button class="projectCard" type="button" data-gallery-kind="projects" data-gallery-index="${i}"><img src="${x}" alt="Projekt ${i+1}"><span class="projectCardBody"><b>Projekt ${String(i+1).padStart(2,'0')}</b><span>Kliknij, aby otworzyć pełny podgląd</span></span></button>`).join('')}</div></section>`:'';
      const faq=extras.some(x=>/faq/i.test(x))?`<section class="demoSection alt"><div class="demoSectionHead"><span class="demoEyebrow">FAQ</span><h3>Najczęstsze pytania</h3></div><div class="demoWhyCards"><div class="demoWhyCard"><b>Jak wygląda wycena?</b><span>Najpierw zbieramy zakres i potrzebne wymiary, a potem przedstawiamy konkretny kolejny krok.</span></div><div class="demoWhyCard"><b>Czy można zamówić usługę pod wymiar?</b><span>Tak — zakres dopasowujemy do konkretnego zlecenia i warunków na miejscu.</span></div><div class="demoWhyCard"><b>Jaki jest termin?</b><span>Termin zależy od zakresu. Po krótkiej rozmowie możemy podać realny przedział.</span></div></div></section>`:'';
      const priceSection=extras.some(x=>/cennik/i.test(x))?`<section class="demoSection"><div class="demoSectionHead"><span class="demoEyebrow">Wycena</span><h3>Cena zależy od zakresu</h3><p class="demoSectionLead">Zamiast przypadkowych widełek pokazujemy klientowi, od czego zależy koszt i kierujemy go do szybkiej wyceny.</p></div><div class="demoWhyCards"><div class="demoWhyCard"><b>Wymiary / zakres</b><span>Wpływają na ilość materiału i czas pracy.</span></div><div class="demoWhyCard"><b>Wykończenie</b><span>Rodzaj wykonania i dodatkowe opcje zmieniają końcową cenę.</span></div><div class="demoWhyCard"><b>Montaż</b><span>Warunki na miejscu uwzględniamy przed finalną wyceną.</span></div></div></section>`:'';
      const reviews=extras.some(x=>/opini/i.test(x))?`<section class="demoSection alt"><div class="demoSectionHead"><span class="demoEyebrow">Opinie</span><h3>Miejsce na opinie klientów</h3><p class="demoSectionLead">Po uruchomieniu możemy podpiąć prawdziwe opinie z Google lub dodać zweryfikowane referencje.</p></div></section>`:'';
      const about=`<section class="demoSection alt"><div class="demoWhy"><div><span class="demoEyebrow">O firmie</span><h3>${esc(d.company||'Poznaj nas bliżej')}</h3><p class="demoAboutText">${esc(aboutCopy(d))}</p><div class="demoWhyCards">${why.map(x=>`<div class="demoWhyCard"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div></div><div class="demoQuote"><b>${esc(highlightClaim(d))}</b><p>${esc(d.city?`${d.city} + okolice. Najpierw ustalamy potrzebę, potem dobieramy rozwiązanie.`:'Najpierw ustalamy potrzebę, potem dobieramy rozwiązanie.')}</p><span class="quoteMeta">${esc(d.company||'Twoja firma')}</span></div></div></section>`;
      const servicesHtml=`<section class="demoSection" id="demo-uslugi"><div class="demoSectionHead"><span class="demoEyebrow">Oferta</span><h3>${esc(copy.servicesTitle)}</h3><p class="demoSectionLead">${esc(copy.servicesLead)}</p></div><div class="demoServices">${services.map((x,i)=>`<article class="demoService"><span class="demoServiceNo">${String(i+1).padStart(2,'0')}</span><h4>${esc(x)}</h4><p>${esc(serviceDesc(x,d.industry))}</p><span class="demoServiceTag">${esc(actionLabel(d))}</span></article>`).join('')}</div></section>`;
      const midSections=layout==='layout-showcase'?(gallery+projects+servicesHtml+about):(servicesHtml+about+gallery+projects);
      const navProjects=d.projectPhotos.length?'<a href="#demo-projekty">Projekty</a>':'';
      generatedSite.innerHTML=`<div class="clientDemo ${cls} ${layout}">
        <nav class="demoNav"><div class="demoBrand">${logo}<span>${esc(d.company||'Twoja Firma')}</span></div><div class="demoNavLinks"><a href="#demo-uslugi">Usługi</a><a href="#demo-realizacje">Realizacje</a>${navProjects}<span>O nas</span><a href="#demo-kontakt">Kontakt</a></div><span class="demoNavCta">${esc(actionLabel(d))}</span></nav>
        <section class="demoSiteHero ${heroPhoto?'hasPhoto':''}">${heroPhoto?`<img class="demoHeroPhoto" src="${heroPhoto}" alt="${esc(d.company)}">`:''}<div class="demoHeroContent"><div class="demoKicker"><span class="demoPill">${esc(d.city||'Twoja okolica')}</span><span class="demoPill secondary">${esc(industryLabel(d.industry))}</span></div><h2>${esc(heroTitle(d))}</h2><p>${esc(heroLead(d))}</p><div class="demoHeroActions"><a class="demoCTA" href="#demo-kontakt">${esc(actionLabel(d))}</a>${d.photos.length?'<a class="demoCTA ghost" href="#demo-realizacje">Zobacz realizacje</a>':''}</div></div></section>
        <div class="demoTrust">${trust.map(x=>`<div class="demoTrustItem"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>
        ${midSections}${faq}${priceSection}${reviews}
        <div class="demoCtaBand"><div><h3>${esc(copy.ctaTitle)}</h3><p>${esc(copy.ctaLead)}</p></div><a class="demoCTA" href="#demo-kontakt">Skontaktuj się</a></div>
        <section class="demoContact" id="demo-kontakt"><div class="demoContactGrid"><div><span class="demoPill">Kontakt</span><h3>${esc(copy.contactTitle)}</h3><p>${esc(copy.contactLead)}</p><div class="demoContactList"><div class="demoContactItem"><b>Telefon</b><br>${esc(d.phone||'do uzupełnienia')}</div>${email?`<div class="demoContactItem"><b>E-mail</b><br>${esc(email)}</div>`:''}<div class="demoContactItem"><b>Obszar działania</b><br>${esc(d.city||'do uzupełnienia')} i okolice</div></div></div><form class="demoRealForm" data-demo-form><h4>${esc(formTitleCopy(d))}</h4><p class="formIntro">${esc(formIntroCopy(d))}</p><div class="demoField"><label>Imię i nazwisko</label><input name="name" required placeholder="Np. Jan Kowalski"></div><div class="demoField"><label>Telefon</label><input name="phone" required placeholder="Np. 500 000 000"></div><div class="demoField"><label>E-mail <span style="font-weight:500;color:#8693a0">(opcjonalnie)</span></label><input name="email" type="email" placeholder="Np. kontakt@firma.pl"></div><div class="demoField"><label>W czym możemy pomóc?</label><select name="service"><option value="">Wybierz usługę</option>${services.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="demoField"><label>${esc(messageLabelCopy(d))}</label><textarea name="message" placeholder="Napisz krótko, czego potrzebujesz"></textarea></div><button class="demoCTA demoFormSubmit" type="submit">Wyślij zapytanie</button><div class="demoFormSuccess">✓ Demo: zgłoszenie zapisane jako lead w tej przeglądarce.</div></form></div></section>
        <div class="domainIdeas"><b>Propozycje domen dla tej firmy</b><div class="domainChips">${domains.map(x=>`<span class="domainChip">${esc(x)}</span>`).join('')}</div></div>
        <div class="previewNote">🔒 To jest wersja demonstracyjna. Publikacja, domena, baza leadów, pełny chatbot AI, generowanie treści/logo przez model AI i integracje są aktywowane po wybraniu pakietu.</div>
        <button class="clientChatBtn" type="button" data-client-chat-toggle aria-label="Otwórz asystenta">💬</button>
        <div class="clientChatPanel" data-client-chat-panel><div class="clientChatHead"><div><b>Asystent ${esc(d.company||'firmy')}</b><small style="display:block;color:#8e9aa6;margin-top:2px">Odpowiadam 24/7</small></div><button type="button" data-client-chat-close>×</button></div><div class="clientChatMsgs" data-client-chat-msgs><div class="clientBubble ai">Cześć 👋 W czym mogę Ci pomóc? Możesz zapytać o ofertę albo wybrać usługę poniżej.</div><div class="clientQuick">${services.slice(0,3).map(x=>`<button type="button" data-client-quick="${esc(x)}">${esc(x)}</button>`).join('')}</div></div><form class="clientChatInput" data-client-chat-form><input placeholder="Napisz wiadomość..."><button type="submit">➤</button></form></div>
      </div>`;
      bindDemoInteractions();if(save)saveLead('generated_demo')
    }

    function generateDemo(){
      try{
        renderDemo(true);
        closeMainChat();
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden','false');
        document.body.style.overflow='hidden';
        syncLiveEditor();
        overlay.scrollTop=0;
      }catch(err){
        console.error('BeeFlow generateDemo error:',err);
        alert('Nie udało się otworzyć podglądu strony. Odśwież stronę i spróbuj ponownie.');
      }
    }

    let galleryIndex=0,galleryItems=[],galleryType='realizations',galleryReturnScroll=0,galleryReturnEl=null;
    function gallerySource(kind){if(kind==='projects')return chat.data.projectPhotos||[];return chat.data.photos||[]}
    function galleryCaption(kind,i){if(kind==='projects')return `Projekt / wizualizacja ${i+1} • ${chat.data.company||'firma'}`;return photoCaption(chat.data,i)}
    function renderLightboxThumbs(){const box=document.getElementById('lbThumbs');box.innerHTML='';galleryItems.forEach((src,i)=>{const b=document.createElement('button');b.type='button';b.className='lbThumb'+(i===galleryIndex?' active':'');b.innerHTML=`<img src="${src}" alt="Miniatura ${i+1}">`;b.onclick=()=>openLightbox(i,galleryType,false);box.appendChild(b)});const active=box.querySelector('.active');if(active){const left=Math.max(0,active.offsetLeft-box.clientWidth/2+active.clientWidth/2);box.scrollTo({left,behavior:'smooth'})}}
    function openLightbox(i,kind='realizations',remember=true){galleryType=kind;galleryItems=gallerySource(kind);if(!galleryItems.length)return;if(remember&&!document.getElementById('lightbox').classList.contains('show')){galleryReturnScroll=overlay.scrollTop;galleryReturnEl=document.activeElement}galleryIndex=(i+galleryItems.length)%galleryItems.length;document.getElementById('lbImg').src=galleryItems[galleryIndex];document.getElementById('lbCaption').textContent=galleryCaption(kind,galleryIndex);document.getElementById('lbTitle').textContent=kind==='projects'?'Projekty i wizualizacje':'Realizacje';document.getElementById('lbCounter').textContent=`${galleryIndex+1} / ${galleryItems.length}`;renderLightboxThumbs();const lb=document.getElementById('lightbox');if(lb.parentElement!==document.body)document.body.appendChild(lb);lb.classList.add('show');lb.setAttribute('aria-hidden','false');document.body.classList.add('gallery-open');document.body.style.overflow='hidden'}
    function closeLightbox(){const lb=document.getElementById('lightbox');lb.classList.remove('show');lb.setAttribute('aria-hidden','true');document.body.classList.remove('gallery-open');if(overlay.classList.contains('show')){document.body.style.overflow='hidden';requestAnimationFrame(()=>{overlay.scrollTop=galleryReturnScroll;requestAnimationFrame(()=>{overlay.scrollTop=galleryReturnScroll;if(galleryReturnEl&&typeof galleryReturnEl.focus==='function')galleryReturnEl.focus({preventScroll:true})})})}else document.body.style.overflow=''}
    function saveClientLead(fd){try{const leads=JSON.parse(localStorage.getItem('beeflow_leads')||'[]');leads.push({source:'client_demo_form',clientCompany:chat.data.company,name:fd.get('name'),phone:fd.get('phone'),email:fd.get('email'),service:fd.get('service'),message:fd.get('message'),createdAt:new Date().toISOString()});localStorage.setItem('beeflow_leads',JSON.stringify(leads))}catch(e){}}
    function clientReply(text){const panel=generatedSite.querySelector('[data-client-chat-panel]');const box=generatedSite.querySelector('[data-client-chat-msgs]');if(!box)return;const u=document.createElement('div');u.className='clientBubble user';u.textContent=text;box.appendChild(u);const a=document.createElement('div');a.className='clientBubble ai';const services=normalizeServices(chat.data.services||'');const match=services.find(x=>text.toLowerCase().includes(x.toLowerCase()));a.textContent=match?`Jasne — ${match} jest w naszej ofercie. Napisz krótko, czego potrzebujesz, albo zostaw numer w formularzu, a wrócimy z konkretną odpowiedzią.`:`Dzięki za wiadomość. Mogę pomóc dobrać usługę i zebrać dane do wyceny. Napisz, czego dokładnie potrzebujesz, albo zostaw kontakt w formularzu poniżej.`;setTimeout(()=>{box.appendChild(a);box.scrollTop=box.scrollHeight},220);box.scrollTop=box.scrollHeight;if(panel)panel.classList.add('open')}
    function bindDemoInteractions(){
      generatedSite.onclick=e=>{const item=e.target.closest('[data-gallery-index]');if(item){e.preventDefault();openLightbox(Number(item.dataset.galleryIndex),item.dataset.galleryKind||'realizations');return}};
      const toggle=generatedSite.querySelector('[data-client-chat-toggle]'),panel=generatedSite.querySelector('[data-client-chat-panel]'),close=generatedSite.querySelector('[data-client-chat-close]');if(toggle&&panel)toggle.onclick=()=>panel.classList.toggle('open');if(close&&panel)close.onclick=()=>panel.classList.remove('open');
      generatedSite.querySelectorAll('[data-client-quick]').forEach(b=>b.onclick=()=>clientReply(b.dataset.clientQuick));const cf=generatedSite.querySelector('[data-client-chat-form]');if(cf)cf.onsubmit=e=>{e.preventDefault();const input=cf.querySelector('input');const t=input.value.trim();if(!t)return;input.value='';clientReply(t)};
      const df=generatedSite.querySelector('[data-demo-form]');if(df)df.onsubmit=e=>{e.preventDefault();saveClientLead(new FormData(df));const ok=df.querySelector('.demoFormSuccess');if(ok)ok.style.display='block';df.reset()};
    }

    function syncLiveEditor(){const vals={editCompany:'company',editIndustry:'industry',editCity:'city',editServices:'services',editUsp:'usp',editHeadline:'headline',editPhone:'phone',editEmail:'email',editStyle:'style'};for(const [id,key] of Object.entries(vals)){const el=document.getElementById(id);if(el)el.value=chat.data[key]||''}const ex=document.getElementById('editExtras');if(ex)ex.value=[...(chat.data.extras||[]),chat.data.extraNotes||''].filter(Boolean).join(', ');const ideas=document.getElementById('editorLogoIdeas');if(ideas){if(chat.data.logoMode==='generated')renderLogoIdeas(ideas,false);else ideas.innerHTML=''}}
    function toggleLiveEditor(force){const ed=document.getElementById('liveEditor');const open=force===undefined?!ed.classList.contains('open'):force;ed.classList.toggle('open',open);ed.setAttribute('aria-hidden',String(!open));if(open)syncLiveEditor()}
    function bindLiveEditor(){
      const vals={editCompany:'company',editIndustry:'industry',editCity:'city',editServices:'services',editUsp:'usp',editHeadline:'headline',editPhone:'phone',editEmail:'email',editStyle:'style'};
      for(const [id,key] of Object.entries(vals)){
        const el=document.getElementById(id);
        el.addEventListener('input',()=>{chat.data[key]=el.value;renderDemo(false);if(key==='company'||key==='industry')renderLogoIdeas(document.getElementById('editorLogoIdeas'),false)});
        el.addEventListener('change',()=>{chat.data[key]=el.value;renderDemo(false)});
      }
      const editPhotos=document.getElementById('editPhotos');
      editPhotos.addEventListener('change',async e=>{
        const files=[...(e.target.files||[])].slice(0,8);if(!files.length)return;
        const next=[];
        for(const file of files)next.push(await imageFileToDataURL(file,1600,.82));
        chat.data.photos=next;renderDemo(false);
      });
      const editProjects=document.getElementById('editProjects');
      editProjects.addEventListener('change',async e=>{const files=[...(e.target.files||[])].slice(0,10);if(!files.length)return;const next=[];for(const file of files)next.push(await imageFileToDataURL(file,1800,.84));chat.data.projectPhotos=next;chat.data.projectsEnabled=next.length>0;renderDemo(false)});
      const editExtras=document.getElementById('editExtras');editExtras.addEventListener('input',()=>{const raw=editExtras.value;chat.data.extraNotes=raw;const lowered=raw.toLowerCase();for(const label of ['FAQ','Cennik','Opinie klientów']){const yes=(label==='FAQ'&&lowered.includes('faq'))||(label==='Cennik'&&lowered.includes('cennik'))||(label==='Opinie klientów'&&lowered.includes('opini'));if(yes&&!chat.data.extras.includes(label))chat.data.extras.push(label)}renderDemo(false)});
      const editLogoFile=document.getElementById('editLogoFile');
      document.getElementById('editUploadLogoBtn').onclick=()=>editLogoFile.click();
      editLogoFile.addEventListener('change',async e=>{
        const file=e.target.files&&e.target.files[0];if(!file)return;
        chat.data.logo=await imageFileToDataURL(file,900,.9);chat.data.logoMode='uploaded';
        document.getElementById('editorLogoIdeas').innerHTML='';renderDemo(false);
      });
      document.getElementById('regenLogoBtn').onclick=()=>{
        chat.data.logo='';chat.data.logoMode='generated';
        renderLogoIdeas(document.getElementById('editorLogoIdeas'),true);
        renderDemo(false);
      };
    }

    function saveLead(source){try{const leads=JSON.parse(localStorage.getItem('beeflow_leads')||'[]');leads.push({...chat.data,logo:!!chat.data.logo,photos:chat.data.photos.length,projects:(chat.data.projectPhotos||[]).length,source,createdAt:new Date().toISOString()});localStorage.setItem('beeflow_leads',JSON.stringify(leads))}catch(e){}}
    document.getElementById('liveEditBtn').onclick=()=>toggleLiveEditor();
    document.getElementById('closeLiveEditor').onclick=()=>toggleLiveEditor(false);
    document.getElementById('backToChat').onclick=()=>{toggleLiveEditor(false);overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';setTimeout(()=>inp.focus(),100)};
    document.getElementById('choosePlan').onclick=()=>{toggleLiveEditor(false);overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';location.hash='cennik'};
    document.getElementById('previewShell').addEventListener('contextmenu',e=>e.preventDefault());
    const initialLightbox=document.getElementById('lightbox');if(initialLightbox&&initialLightbox.parentElement!==document.body)document.body.appendChild(initialLightbox);document.getElementById('lbClose').onclick=closeLightbox;document.getElementById('lbPrev').onclick=()=>openLightbox(galleryIndex-1,galleryType,false);document.getElementById('lbNext').onclick=()=>openLightbox(galleryIndex+1,galleryType,false);let lbTouchX=null;const lbStage=document.getElementById('lbStage');lbStage.addEventListener('touchstart',e=>{if(e.touches.length===1)lbTouchX=e.touches[0].clientX},{passive:true});lbStage.addEventListener('touchend',e=>{if(lbTouchX===null||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-lbTouchX;lbTouchX=null;if(Math.abs(dx)<45)return;if(dx<0)openLightbox(galleryIndex+1,galleryType,false);else openLightbox(galleryIndex-1,galleryType,false)},{passive:true});document.addEventListener('keydown',e=>{if(!document.getElementById('lightbox').classList.contains('show'))return;if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')openLightbox(galleryIndex-1,galleryType,false);if(e.key==='ArrowRight')openLightbox(galleryIndex+1,galleryType,false)});bindLiveEditor();
    document.getElementById('contactForm').addEventListener('submit',e=>{e.preventDefault();const lead={name:document.getElementById('name').value,phone:document.getElementById('phone').value,email:document.getElementById('email').value,industry:document.getElementById('industry').value,need:document.getElementById('need').value,source:'form',createdAt:new Date().toISOString()};try{const leads=JSON.parse(localStorage.getItem('beeflow_leads')||'[]');leads.push(lead);localStorage.setItem('beeflow_leads',JSON.stringify(leads))}catch(err){}document.getElementById('success').style.display='block';e.target.reset()});

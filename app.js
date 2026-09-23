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

    const chat={started:false,step:0,phase:'ask',pendingKey:null,pendingValue:'',needsName:false,nameRound:0,lastSuggestedName:'',extraRound:0,data:{company:'',businessBrief:'',industry:'',city:'',services:'',style:'',usp:'',headline:'',phone:'',email:'',logo:'',logoMode:'none',logoSeed:0,photos:[],projectPhotos:[],extras:[],extraNotes:'',projectsEnabled:false}};

    function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
    function bubble(text,who='ai',html=false){const d=document.createElement('div');d.className='bubble '+who;if(html)d.innerHTML=text;else d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
    function ai(text,html=false){setTimeout(()=>bubble(text,'ai',html),120)}
    function updateProgress(){const total=questions.length;const done=Math.min(chat.step,total);progressFill.style.width=((done/total)*100)+'%';progressText.textContent=chat.phase==='extras'?'Podstawowe dane zebrane — dodatki':chat.phase==='upload'?'Dane zebrane — materiały':chat.step>=total?'Podstawowe dane zebrane':`Krok ${Math.min(chat.step+1,total)} z ${total}`}
    function initChat(){if(chat.started){setTimeout(()=>inp.focus(),100);return}chat.started=true;msgs.innerHTML='';bubble('Cześć 👋 Jestem kreatorem BeeFlow AI. Nie będę tylko leciał pytanie po pytaniu — po każdej ważnej odpowiedzi upewnię się, że dobrze Cię zrozumiałem.','ai');setTimeout(()=>askCurrent(),180)}
    function addChips(items,handler){const q=document.createElement('div');q.className='quick';items.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=item;b.onclick=()=>handler?handler(item):submitMessage(item);q.appendChild(b)});msgs.appendChild(q);msgs.scrollTop=msgs.scrollHeight}
    function addConfirmButtons(){const row=document.createElement('div');row.className='confirmRow';[['Tak, zgadza się','yes','primary'],['Chcę poprawić','no','']].forEach(([txt,val,cls])=>{const b=document.createElement('button');b.type='button';b.className='confirmBtn '+cls;b.textContent=txt;b.onclick=()=>handleConfirmation(val);row.appendChild(b)});msgs.appendChild(row);msgs.scrollTop=msgs.scrollHeight}
    function normalizeServices(raw){return raw.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).slice(0,8)}
    function fieldLabel(key){return ({company:'nazwa firmy',industry:'branża / zakres działalności',city:'obszar działania',services:'usługi',style:'styl strony',usp:'wyróżnik firmy',phone:'telefon',email:'e-mail'})[key]||key}
    function fieldSummary(key,value){if(key==='services')return normalizeServices(value).join(' • ');if(key==='usp'&&!value)return 'bez dodatkowego wyróżnika';if(key==='email'&&!value)return 'e-mail ukryty';return value}
    function isYes(t){return /^(tak|tak,|zgadza|zgadza się|ok|okej|dobrze|zostaw|pasuje|ta odpowiada|może być|super)/i.test(t)}
    function isNo(t){return /^(nie|nie,|inna|inny|zmień|zmien|popraw|nie pasuje|nie odpowiada)/i.test(t)}
    function isNoName(t){return /^(nie mam( nazwy)?|brak( nazwy)?|bez nazwy)$/i.test(t.trim())}
    function sanitizeValue(key,t){if(key==='usp'&&/^(pomiń|brak|nic)$/i.test(t))return '';if(key==='email'&&/^(pomiń|brak|nie chcę|nie chce)$/i.test(t))return '';return t.trim()}
    function askCurrent(){updateProgress();const next=questions[chat.step];if(!next){startExtras();return}chat.phase='ask';chat.pendingKey=next.key;ai(next.q);if(next.chips)setTimeout(()=>addChips(next.chips),260)}
    function confirmValue(key,value){chat.phase='confirm';chat.pendingKey=key;chat.pendingValue=value;ai(`<div class="chatSummary"><b>Rozumiem to tak:</b><br>${esc(fieldLabel(key))}: <b>${esc(fieldSummary(key,value))}</b><span class="smartHint">Nie przejdę dalej, dopóki tego nie potwierdzisz.</span></div>`,true);setTimeout(addConfirmButtons,170)}
    function commitPending(){const key=chat.pendingKey,value=chat.pendingValue;chat.data[key]=value;chat.pendingKey=null;chat.pendingValue='';chat.phase='ask';const advancesCurrent=questions[chat.step]&&questions[chat.step].key===key;if(advancesCurrent)chat.step++;if(key==='company')chat.needsName=false;
      if(key==='industry'&&chat.needsName){setTimeout(offerNameSuggestion,180);return}
      if(chat.step>=questions.length){setTimeout(startExtras,180);return}
      setTimeout(askCurrent,180)}
    function handleConfirmation(answerText){if(chat.phase!=='confirm')return;if(answerText==='yes'||isYes(answerText)){commitPending();return}chat.phase='ask';const key=chat.pendingKey;chat.pendingValue='';if(key==='company'){if(!chat.data.industry){chat.needsName=true;chat.step=1;ai('Jasne. Żeby zaproponować dobrą nazwę, najpierw muszę wiedzieć dokładnie, czym zajmuje się firma.');setTimeout(askCurrent,180);return}chat.nameRound++;offerNameSuggestion(true);return}ai(`Jasne. Poprawmy ${fieldLabel(key)}. Napisz właściwą wersję, a najpierw ją potwierdzę.`)}

    function nameTokens(industry=''){const x=industry.toLowerCase();if(/bram|ogrod|spaw|stal/.test(x))return ['StalForma','BramaLab','StalPoint','ForgeLine','SolidGate','MetalForma'];if(/detail|auto|samoch|lakier/.test(x))return ['DetailForge','AutoGlow','PrimeDetail','ShineLab','DetailPoint','AutoForma'];if(/budow|remont|wykoń/.test(x))return ['SolidDom','BuildForma','ProConstruct','DomPoint','FormaBud','BuildLab'];if(/fryz|beauty|kosmet|paznok/.test(x))return ['AuraStudio','PureLine','NovaBeauty','GlowRoom','FormaBeauty','LunaStudio'];if(/transport|przeprowad|kurier/.test(x))return ['MovePoint','CargoFlow','TransForma','RoutePro','FastLine','MoveLab'];const base=(industry||'Firma').replace(/[^\p{L}\p{N} ]/gu,' ').trim().split(/\s+/)[0]||'Firma';return [base+' Studio',base+' Pro',base+' Point',base+' Lab',base+' Works',base+' Prime']}
    function scoreName(name){let score=7;const len=name.replace(/\s/g,'').length;if(len>=6&&len<=12)score+=1;if(!/[0-9]/.test(name))score+=.5;if(name.split(/\s+/).length<=2)score+=.5;return Math.min(9.5,score).toFixed(1)}
    function nameReason(name){const parts=[];if(name.length<15)parts.push('krótka');if(name.split(/\s+/).length<=2)parts.push('łatwa do zapamiętania');parts.push('nadaje się do logo i domeny');return parts.join(', ')}
    function offerNameSuggestion(forceAlternative=false){chat.phase='naming';chat.needsName=true;const list=nameTokens(chat.data.industry);const idx=(chat.nameRound++)%list.length;let proposed=list[idx];if(proposed===chat.lastSuggestedName)proposed=list[(idx+1)%list.length];chat.lastSuggestedName=proposed;ai(`<div class="nameProposal"><span class="nameScore">Ocena marketingowa demo: ${scoreName(proposed)}/10</span><strong>${esc(proposed)}</strong><p>${esc(nameReason(proposed))}. To jest ocena heurystyczna BeeFlow — prawdziwe sprawdzenie konkurencji, domen i znaków towarowych dołączymy po podpięciu backendu.</p></div>`,true);setTimeout(()=>addChips(['Tak, ta nazwa pasuje','Pokaż inną nazwę','Wpiszę własną nazwę'],handleNameChoice),200)}
    function handleNameChoice(choice){if(/tak/i.test(choice)){confirmValue('company',chat.lastSuggestedName);return}if(/inną/i.test(choice)){offerNameSuggestion(true);return}chat.phase='naming-custom';ai('Jasne. Wpisz własną nazwę firmy — zatrzymam się na tym kroku, dopóki jej nie zaakceptujesz.')}

    function detectGlobalCorrection(t){const x=t.toLowerCase();if(/inna\s+nazwa|zmień\s+nazw|zmien\s+nazw|nie.*nazwa/.test(x)){chat.nameRound++;offerNameSuggestion(true);return true}const map=[['miast','city'],['obszar','city'],['usług','services'],['styl','style'],['telefon','phone'],['mail','email'],['e-mail','email'],['wyróż','usp'],['branż','industry']];for(const [needle,key] of map){if((x.includes('zmień')||x.includes('zmien')||x.includes('popraw'))&&x.includes(needle)){chat.phase='ask';chat.pendingKey=key;chat.step=Math.max(0,questions.findIndex(q=>q.key===key));ai(`Okej — wracamy do pola „${fieldLabel(key)}”. Podaj nową wersję.`);return true}}return false}

    function handleAskAnswer(t){const current=questions[chat.step];if(!current){startExtras();return}const key=current.key;if(key==='company'&&isNoName(t)){chat.needsName=true;chat.data.company='';chat.step++;ai('Jasne — najpierw poznam branżę, a potem zaproponuję nazwę i nie pójdziemy dalej, dopóki jej nie zaakceptujesz.');setTimeout(askCurrent,180);return}const value=sanitizeValue(key,t);if(key==='services'&&normalizeServices(value).length<2){ai('Daj mi proszę przynajmniej 2 usługi. Możesz je oddzielić przecinkami.');return}confirmValue(key,value)}

    function submitMessage(text){const t=(text??inp.value).trim();if(!t)return;bubble(t,'user');inp.value='';if(detectGlobalCorrection(t))return;
      if(chat.phase==='confirm'){if(isYes(t)){handleConfirmation('yes');return}if(isNo(t)){handleConfirmation('no');return}chat.pendingValue=sanitizeValue(chat.pendingKey,t);confirmValue(chat.pendingKey,chat.pendingValue);return}
      if(chat.phase==='naming'){if(/inna|inny|kolejn/.test(t.toLowerCase())){offerNameSuggestion(true);return}if(isYes(t)){confirmValue('company',chat.lastSuggestedName);return}confirmValue('company',t);return}
      if(chat.phase==='naming-custom'){confirmValue('company',t);return}
      if(chat.phase==='extras'){handleExtraAnswer(t);return}
      handleAskAnswer(t)}
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
    function industryLabel(industry=''){return industry.trim()||'Profesjonalne usługi'}
    function cleanUsp(usp=''){return /^(pomiń|brak)$/i.test(usp.trim())?'':usp.trim()}
    function heroTitle(d){if((d.headline||'').trim())return d.headline.trim();const ind=(d.industry||'').toLowerCase();const us=normalizeServices(d.services||'').map(x=>x.toLowerCase()).join(' ');if(/bram|ogrodz|spaw/.test(ind+' '+us))return 'Bramy i ogrodzenia dopasowane do Twojej posesji.';if(/detail|auto|samoch|lakier/.test(ind+' '+us))return 'Zadbaj o auto tak, żeby efekt było widać od pierwszego spojrzenia.';if(/budow|remont|wykoń/.test(ind+' '+us))return 'Dobra realizacja zaczyna się od konkretnego planu.';if(/fryz|beauty|kosmet|paznok/.test(ind+' '+us))return 'Profesjonalny efekt w miejscu, do którego chce się wracać.';if(/transport|przeprowad|kurier/.test(ind+' '+us))return 'Sprawna obsługa, jasne warunki i terminowa realizacja.';return `${d.company||'Twoja firma'} — profesjonalnie od pierwszego kontaktu.`}
    function heroLead(d){const usp=cleanUsp(d.usp);const area=d.city?`Obsługujemy ${d.city} i okolice.`:'Obsługujemy klientów lokalnie.';if(usp)return `${usp}. ${area} Każde zapytanie traktujemy indywidualnie i jasno ustalamy zakres realizacji.`;return `${industryLabel(d.industry)} dopasowane do potrzeb klienta. ${area} Szybki kontakt, czytelna oferta i konkretny następny krok.`}
    function serviceDesc(name,industry=''){const n=(name+' '+industry).toLowerCase();if(/bram.*przesuw|przesuw.*bram/.test(n))return 'Projekt, wykonanie i dopasowanie bramy przesuwnej do światła wjazdu, sposobu użytkowania oraz warunków na posesji.';if(/bram/.test(n))return 'Wykonanie konstrukcji pod konkretny wymiar, charakter posesji i sposób użytkowania — od ustalenia zakresu po gotowy montaż.';if(/ogrodz/.test(n))return 'Spójne wizualnie ogrodzenie dopasowane do budynku, działki i oczekiwanego poziomu prywatności.';if(/furt/.test(n))return 'Furtka dopasowana do bramy i ogrodzenia, z naciskiem na wygodę użytkowania oraz trwałe wykonanie.';if(/malow|lakier|proszk/.test(n))return 'Przygotowanie i estetyczne zabezpieczenie powierzchni, tak aby wykończenie dobrze wyglądało i było odporne na eksploatację.';if(/montaż|montaz/.test(n))return 'Dokładny montaż z ustawieniem elementów, kontrolą pracy i końcowym sprawdzeniem całej realizacji.';if(/ceram/.test(n))return 'Zabezpieczenie lakieru powłoką dobraną do oczekiwanego efektu, sposobu użytkowania auta i poziomu ochrony.';if(/poler|korekt/.test(n))return 'Korekta powierzchni nastawiona na poprawę głębi lakieru, ograniczenie zarysowań i przygotowanie auta do zabezpieczenia.';if(/pran|wnętr|wnetr/.test(n))return 'Dokładne czyszczenie wnętrza z doborem procesu do materiałów oraz stopnia zabrudzenia.';if(/remont|wykoń|wykoncz/.test(n))return 'Zakres prac ustalany przed startem, z naciskiem na porządek realizacji, komunikację i przewidywalny efekt końcowy.';return 'Zakres usługi ustalamy indywidualnie, tak aby klient od początku wiedział, co obejmuje realizacja i jaki jest kolejny krok.'}
    function aboutCopy(d){const usp=cleanUsp(d.usp);const ind=industryLabel(d.industry).toLowerCase();return `${d.company||'Nasza firma'} specjalizuje się w ${ind}. ${usp?usp+'. ':''}Najważniejsze są dla nas jasne ustalenia, dobry kontakt i wykonanie zgodne z tym, na co umówiliśmy się z klientem.`}
    function trustItems(d){const ind=(d.industry||'').toLowerCase();if(/bram|ogrodz|spaw/.test(ind))return [['Wykonanie pod wymiar','Rozwiązanie dopasowane do konkretnej posesji'],['Jasny zakres prac','Wiesz, co obejmuje realizacja'],['Kontakt lokalny',`${d.city||'Twoja okolica'} i okolice`]];if(/detail|auto/.test(ind))return [['Dobór usługi','Zakres dopasowany do stanu auta'],['Dokładne wykonanie','Nacisk na detal i efekt końcowy'],['Wygodny kontakt','Szybkie ustalenie terminu']];return [['Szybka odpowiedź','Bez zbędnego czekania'],['Jasna wycena','Czytelny zakres i kolejny krok'],['Lokalna obsługa',`${d.city||'Twoja okolica'} i okolice`]]}
    function whyCards(d){const usp=cleanUsp(d.usp);return [['Indywidualne podejście','Zakres dopasowany do konkretnego zlecenia.'],['Dobry kontakt','Klient wie, co dzieje się na każdym etapie.'],['Przejrzyste zasady','Najważniejsze ustalenia są jasne przed startem.'],[usp||'Dbałość o wykonanie',usp?'To właśnie ten element wyróżnia firmę na tle konkurencji.':'Efekt ma dobrze wyglądać i dobrze działać.']]}
    function siteCopy(d){
      const cat=categoryKey(d), n=hashString(`${d.company||''}|${d.city||''}|sections`)%3;
      const packs={
        gates:[
          {servicesTitle:'Co zrobimy dla Twojego wjazdu',servicesLead:'Pomiar, wykonanie i montaż — wszystko pod konkretną posesję.',ctaTitle:'Masz pomysł na bramę?',ctaLead:'Pokaż wjazd lub podaj wymiary. Powiemy, co ma sens.',contactTitle:'Wyceńmy Twoją bramę',contactLead:'Zostaw kontakt. Dopytamy tylko o rzeczy potrzebne do wyceny.'},
          {servicesTitle:'Od pomiaru do montażu',servicesLead:'Ty pokazujesz, czego potrzebujesz. My dobieramy wykonanie.',ctaTitle:'Zacznij od krótkiej rozmowy',ctaLead:'Bez zobowiązań. Najpierw ustalamy, co chcesz zrobić.',contactTitle:'Porozmawiajmy o wjeździe',contactLead:'Numer telefonu i krótki opis wystarczą na start.'},
          {servicesTitle:'Bramy i ogrodzenia pod wymiar',servicesLead:'Bez gotowych schematów. Rozwiązanie dopasowane do Twojej posesji.',ctaTitle:'Chcesz poznać koszt?',ctaLead:'Podeślij podstawowe informacje. Przygotujemy konkretny kolejny krok.',contactTitle:'Poproś o wycenę',contactLead:'Napisz, czego potrzebujesz. Odezwie się do Ciebie człowiek.'}
        ],
        auto:[
          {servicesTitle:'Wybierz efekt, nie pakiet',servicesLead:'Dobieramy usługę do stanu auta i tego, co chcesz poprawić.',ctaTitle:'Chcesz, żeby auto znów robiło wrażenie?',ctaLead:'Napisz model i oczekiwany efekt.',contactTitle:'Dobierzmy usługę',contactLead:'Zostaw kontakt i model auta.'},
          {servicesTitle:'Co możemy zrobić dla Twojego auta',servicesLead:'Krótko, konkretnie i bez wciskania zbędnych usług.',ctaTitle:'Sprawdź, czego potrzebuje Twoje auto',ctaLead:'Wyślij podstawowe informacje.',contactTitle:'Umówmy zakres i termin',contactLead:'Zostaw kontakt — wrócimy z propozycją.'},
          {servicesTitle:'Detailing dopasowany do auta',servicesLead:'Zakres wynika ze stanu auta, nie z gotowego cennika.',ctaTitle:'Masz konkretny efekt na oku?',ctaLead:'Powiedz jaki. Dobierzemy drogę do niego.',contactTitle:'Porozmawiajmy o aucie',contactLead:'Model, usługa i kontakt — tyle wystarczy.'}
        ],
        build:[
          {servicesTitle:'Zakres prac bez niedomówień',servicesLead:'Wiesz, co robimy, zanim zaczniemy.',ctaTitle:'Masz pracę do wyceny?',ctaLead:'Opisz zakres. Resztę doprecyzujemy.',contactTitle:'Omówmy realizację',contactLead:'Zostaw kontakt i krótki opis.'},
          {servicesTitle:'Od planu do gotowego efektu',servicesLead:'Konkretny zakres i jasny kolejny krok.',ctaTitle:'Zacznijmy od zakresu',ctaLead:'Powiedz, co chcesz zrobić.',contactTitle:'Poproś o wycenę',contactLead:'Krótki opis wystarczy na start.'},
          {servicesTitle:'Prace prowadzone krok po kroku',servicesLead:'Mniej chaosu, więcej jasnych ustaleń.',ctaTitle:'Planujesz realizację?',ctaLead:'Napisz, czego potrzebujesz.',contactTitle:'Porozmawiajmy o terminie',contactLead:'Zostaw numer i zakres prac.'}
        ],
        transport:[
          {servicesTitle:'Transport bez komplikacji',servicesLead:'Trasa, ładunek, termin — i możemy działać.',ctaTitle:'Masz coś do przewiezienia?',ctaLead:'Podaj skąd, dokąd i co przewozimy.',contactTitle:'Sprawdź termin i cenę',contactLead:'Zostaw dane trasy i kontakt.'},
          {servicesTitle:'Przewóz dopasowany do zlecenia',servicesLead:'Bez zgadywania — najpierw konkretne dane.',ctaTitle:'Potrzebujesz transportu?',ctaLead:'Napisz trasę i termin.',contactTitle:'Wyceńmy przejazd',contactLead:'Kilka danych i wrócimy z odpowiedzią.'},
          {servicesTitle:'Szybka wycena transportu',servicesLead:'Podajesz trasę. My sprawdzamy możliwość realizacji.',ctaTitle:'Sprawdź dostępność',ctaLead:'Podaj termin i miejsce odbioru.',contactTitle:'Zostaw dane zlecenia',contactLead:'Skąd, dokąd, co i kiedy.'}
        ],
        beauty:[
          {servicesTitle:'Wybierz efekt, którego szukasz',servicesLead:'Pomagamy dobrać usługę bez zbędnego kombinowania.',ctaTitle:'Chcesz umówić wizytę?',ctaLead:'Wybierz usługę i zostaw kontakt.',contactTitle:'Umów termin',contactLead:'Napisz, jaka usługa Cię interesuje.'},
          {servicesTitle:'Usługi dopasowane do Ciebie',servicesLead:'Krótko wyjaśniamy, co daje każda z nich.',ctaTitle:'Gotowa na wizytę?',ctaLead:'Wybierz zakres i dogodny termin.',contactTitle:'Zarezerwuj kontakt',contactLead:'Zostaw numer lub e-mail.'},
          {servicesTitle:'Twój efekt, nasza praca',servicesLead:'Dobieramy usługę do tego, czego oczekujesz.',ctaTitle:'Zrób pierwszy krok',ctaLead:'Napisz, jaki efekt chcesz osiągnąć.',contactTitle:'Umówmy wizytę',contactLead:'Zostaw kontakt, odezwiemy się.'}
        ],
        general:[
          {servicesTitle:'Zobacz, co możemy dla Ciebie zrobić',servicesLead:'Konkretny zakres. Krótkie opisy. Szybka decyzja.',ctaTitle:'Masz zlecenie?',ctaLead:'Opisz je w dwóch zdaniach.',contactTitle:'Porozmawiajmy',contactLead:'Zostaw kontakt i krótki opis.'},
          {servicesTitle:'Oferta bez zbędnych słów',servicesLead:'Od razu widzisz, czy to rozwiązanie dla Ciebie.',ctaTitle:'Chcesz poznać kolejny krok?',ctaLead:'Napisz, czego potrzebujesz.',contactTitle:'Zostaw kontakt',contactLead:'Wrócimy z konkretną odpowiedzią.'},
          {servicesTitle:'W czym możemy pomóc',servicesLead:'Krótko, jasno i pod konkretną potrzebę.',ctaTitle:'Zacznijmy od rozmowy',ctaLead:'Kilka informacji wystarczy.',contactTitle:'Napisz do nas',contactLead:'Kontakt i krótki opis — resztę ustalimy.'}
        ]
      };
      return (packs[cat]||packs.general)[n]
    }
    function initials(name='Firma'){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'F'}
    function slugify(s=''){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'').slice(0,28)||'twojafirma'}
    function domainIdeas(d){const base=slugify(d.company);const city=slugify(d.city);return [...new Set([`${base}.pl`,city?`${base}-${city}.pl`:null,`${base}24.pl`].filter(Boolean))]}
    function photoCaption(d,i){const services=normalizeServices(d.services||'');const label=services[i%Math.max(services.length,1)]||'Realizacja';return `${label} • ${d.city||d.company||'realizacja'}`}

    // ===== BeeFlow v9: krótki, sprzedażowy copy engine =====
    function businessContext(d=chat.data){return [d.businessBrief,d.industry,d.services,d.usp].filter(Boolean).join(' ').toLowerCase()}
    function deriveIndustryLabel(text=''){
      const x=String(text).toLowerCase();
      if(/bram|ogrodz|furt|spaw|stal/.test(x))return 'Bramy i ogrodzenia';
      if(/detail|auto|samoch|lakier|ceram|poler/.test(x))return 'Detailing samochodowy';
      if(/budow|remont|wykoń|wykoncz|elewac|mur/.test(x))return 'Usługi budowlane';
      if(/fryz|beauty|kosmet|paznok|makija/.test(x))return 'Beauty';
      if(/transport|przeprowad|kurier|dostaw/.test(x))return 'Transport';
      if(/hydraul|instalac|wod-kan|ogrzew/.test(x))return 'Hydraulika i instalacje';
      if(/elektryk|elektrycz|instalacja elek/.test(x))return 'Usługi elektryczne';
      if(/klimatyz|wentyl/.test(x))return 'Klimatyzacja i wentylacja';
      if(/sprząt|sprzatan|clean/.test(x))return 'Usługi sprzątające';
      const words=String(text).replace(/[^\p{L}\p{N} ]/gu,' ').trim().split(/\s+/).filter(Boolean).slice(0,4);
      return words.length?words.join(' '):'Profesjonalne usługi';
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
      const x=businessContext(d);
      if(/bram|ogrodz|furt|spaw|stal/.test(x))return 'gates';
      if(/detail|auto|samoch|lakier|ceram|poler/.test(x))return 'auto';
      if(/budow|remont|wykoń|wykoncz/.test(x))return 'build';
      if(/fryz|beauty|kosmet|paznok/.test(x))return 'beauty';
      if(/transport|przeprowad|kurier|dostaw/.test(x))return 'transport';
      return 'general'
    }
    function areaCopy(d){return d.city?`${d.city} + okolice`:'Lokalnie i w okolicy'}
    function pickCopy(d,list,salt=''){return list[hashString(`${d.company||''}|${d.industry||''}|${d.city||''}|${salt}`)%list.length]}
    function heroTitle(d){
      if((d.headline||'').trim())return d.headline.trim();
      const cat=categoryKey(d), variants={
        gates:['Brama na wymiar. Bez kompromisów.','Od pomiaru do gotowej bramy.','Twój wjazd. Nasza stal. Gotowy efekt.','Bramy, które naprawdę pasują do posesji.'],
        auto:['Auto, które znów robi wrażenie.','Efekt widać od pierwszego spojrzenia.','Czysto. Głęboko. Zabezpieczone.'],
        build:['Konkretny zakres. Porządne wykonanie.','Od planu do gotowego efektu.','Remont bez chaosu i niedomówień.'],
        beauty:['Efekt, po który chce się wracać.','Twój czas. Twój efekt.','Profesjonalnie, ale bez sztywnej atmosfery.'],
        transport:['Dowozimy. Na czas. Bez komplikacji.','Transport, który po prostu działa.','Trasa ustalona. Ładunek zabezpieczony. Termin dotrzymany.'],
        general:[`${d.company||'Twoja firma'}. Konkret zamiast obietnic.`,`${d.company||'Twoja firma'} — dobry efekt zaczyna się od dobrych ustaleń.`,`Usługa dopasowana do Ciebie, nie odwrotnie.`]
      };
      return pickCopy(d,variants[cat]||variants.general,'hero')
    }
    function heroLead(d){
      const cat=categoryKey(d), area=areaCopy(d), f=businessFeatures(d);
      if(cat==='gates'){
        if(f.includes('Własna produkcja'))return `Mierzymy, projektujemy i wykonujemy u siebie. ${area}.`;
        return `Pomiar, wykonanie i montaż pod konkretny wjazd. ${area}.`;
      }
      if(cat==='auto')return `Dobieramy usługę do stanu auta i efektu, którego oczekujesz. ${area}.`;
      if(cat==='build')return `Najpierw zakres i wycena. Potem sprawna realizacja bez zgadywania. ${area}.`;
      if(cat==='transport')return `Podajesz trasę i ładunek. My ustalamy termin i konkretną cenę. ${area}.`;
      if(cat==='beauty')return `Wybierasz efekt. My dobieramy usługę i dogodny termin. ${area}.`;
      return `Krótka rozmowa, jasny zakres i konkretny kolejny krok. ${area}.`
    }
    function serviceDesc(name,industry=''){
      const n=String(name).toLowerCase(), ctx=(n+' '+String(industry).toLowerCase());
      if(/spawan|spaw/.test(n))return 'Spawamy konstrukcję pod wymiar — solidnie i pod konkretny wjazd.';
      if(/bram.*przesuw|przesuw.*bram/.test(ctx))return 'Dobieramy skrzydło, przeciwwagę i prowadzenie dokładnie do Twojego wjazdu.';
      if(/bram/.test(n))return 'Projektujemy i wykonujemy bramę tak, żeby dobrze wyglądała i wygodnie działała.';
      if(/ogrodz/.test(n))return 'Dopasowujemy ogrodzenie do posesji, bramy i oczekiwanego poziomu prywatności.';
      if(/furt/.test(n))return 'Furtka w tym samym stylu, z dobrym dopasowaniem i wygodnym użytkowaniem.';
      if(/malow|lakier|proszk/.test(n))return 'Zabezpieczamy stal i nadajemy jej estetyczne wykończenie na lata.';
      if(/montaż|montaz/.test(n))return 'Montujemy, regulujemy i sprawdzamy całość przed odbiorem.';
      if(/transport|dowóz|dowoz|dostaw/.test(n))return 'Dostarczamy gotowe elementy bezpiecznie na miejsce montażu.';
      if(/pomiar/.test(n))return 'Przyjeżdżamy, mierzymy i sprawdzamy warunki jeszcze przed produkcją.';
      if(/projekt|wizual/.test(n))return 'Twój pomysł przekładamy na rozwiązanie, które da się dobrze wykonać.';
      if(/automat|napęd|naped/.test(n))return 'Dobieramy napęd do bramy i konfigurujemy go po montażu.';
      if(/ceram/.test(n))return 'Zabezpieczamy lakier i wydobywamy głębię koloru na dłużej.';
      if(/poler|korekt/.test(n))return 'Usuwamy widoczne niedoskonałości i przywracamy lakierowi głębię.';
      if(/pran|wnętr|wnetr/.test(n))return 'Czyścimy wnętrze dokładnie, z metodą dobraną do materiału.';
      if(/remont|wykoń|wykoncz/.test(n))return 'Ustalamy zakres przed startem i prowadzimy prace krok po kroku.';
      return 'Ustalamy zakres, wyceniamy konkretnie i realizujemy bez zbędnych niespodzianek.'
    }
    function aboutCopy(d){
      const cat=categoryKey(d), f=businessFeatures(d), area=areaCopy(d), name=d.company||'Nasza firma';
      if(cat==='gates'){
        const own=f.includes('Własna produkcja')?' Własna produkcja daje nam kontrolę nad każdym etapem.':'';
        return `${name} tworzy bramy i ogrodzenia na wymiar — od pomiaru po montaż.${own} ${area}.`;
      }
      if(cat==='auto')return `${name} dba o wygląd i zabezpieczenie aut. Dobieramy zakres do stanu samochodu, a nie do gotowego pakietu. ${area}.`;
      if(cat==='build')return `${name} realizuje prace według ustalonego zakresu. Bez niedomówień, z jasnym kontaktem na każdym etapie. ${area}.`;
      if(cat==='transport')return `${name} organizuje przewóz sprawnie i konkretnie — trasa, termin i warunki są jasne od początku. ${area}.`;
      return `${name} stawia na jasne ustalenia, dobry kontakt i rozwiązania dopasowane do konkretnego zlecenia. ${area}.`
    }
    function trustItems(d){
      const cat=categoryKey(d), f=businessFeatures(d), area=areaCopy(d);
      if(cat==='gates')return [[f.includes('Pomiar i wykonanie pod wymiar')?'Pod wymiar':'Dopasowanie','Nie z katalogu — pod konkretny wjazd'],[f.includes('Własna produkcja')?'Własna produkcja':'Pewny proces','Kontrola od stali do montażu'],['Lokalnie',area]];
      if(cat==='auto')return [['Dobór zakresu','Tylko to, czego auto naprawdę potrzebuje'],['Detal','Efekt widać z bliska'],['Termin','Szybkie i jasne ustalenie']];
      return [['Jasny zakres','Wiesz, za co płacisz'],['Dobry kontakt','Bez gonienia za odpowiedzią'],['Lokalnie',area]]
    }
    function whyCards(d){
      const f=businessFeatures(d), cat=categoryKey(d), cards=[];
      if(f.includes('Własna produkcja'))cards.push(['Własna produkcja','Kontrolujemy wykonanie od pierwszego cięcia.']);
      if(f.includes('Pomiar i wykonanie pod wymiar'))cards.push(['Pomiar na miejscu','Mierzymy przed produkcją, żeby wszystko pasowało.']);
      if(f.includes('Projekt dopasowany do pomysłu klienta'))cards.push(['Projekt pod klienta','Twój pomysł dopasowujemy do realnych warunków.']);
      if(f.includes('Montaż gotowej realizacji'))cards.push(['Montaż i regulacja','Oddajemy gotową, ustawioną konstrukcję.']);
      if(cat==='gates'&&cards.length<4)cards.push(['Dobór konstrukcji','Profile i wzmocnienia dobieramy do konkretnej bramy.']);
      while(cards.length<4){const defaults=[['Czytelna wycena','Najpierw zakres, potem konkretna cena.'],['Dobry kontakt','Wiesz, co dzieje się dalej.'],['Pod Twoje zlecenie','Nie wciskamy jednego rozwiązania każdemu.'],['Sprawdzone przed odbiorem','Kończymy dopiero, gdy wszystko działa jak trzeba.']];const n=defaults.find(x=>!cards.some(c=>c[0]===x[0]));if(!n)break;cards.push(n)}
      return cards.slice(0,4)
    }

    // Chat v9: opis firmy jest materiałem roboczym, a nie tekstem do wklejenia 1:1.
    function fieldLabel(key){return ({company:'nazwa firmy',businessBrief:'opis firmy do analizy',industry:'branża / kategoria',city:'obszar działania',services:'usługi',style:'styl strony',usp:'wyróżnik firmy',phone:'telefon',email:'e-mail'})[key]||key}
    function commitPending(){
      const key=chat.pendingKey,value=chat.pendingValue;
      if(key==='businessBrief'){chat.data.businessBrief=value;chat.data.industry=deriveIndustryLabel(value)}else chat.data[key]=value;
      chat.pendingKey=null;chat.pendingValue='';chat.phase='ask';
      const advancesCurrent=questions[chat.step]&&questions[chat.step].key===key;if(advancesCurrent)chat.step++;
      if(key==='company')chat.needsName=false;
      if(key==='businessBrief'&&chat.needsName){setTimeout(offerNameSuggestion,180);return}
      if(chat.step>=questions.length){setTimeout(startExtras,180);return}
      setTimeout(askCurrent,180)
    }
    function handleConfirmation(answerText){
      if(chat.phase!=='confirm')return;
      if(answerText==='yes'||isYes(answerText)){commitPending();return}
      chat.phase='ask';const key=chat.pendingKey;chat.pendingValue='';
      if(key==='company'){
        if(!chat.data.businessBrief){chat.needsName=true;chat.step=1;ai('Jasne. Najpierw poznam firmę, żeby kolejna nazwa miała sens. Opis wykorzystam tylko do analizy — nie wkleję go później 1:1 na stronę.');setTimeout(askCurrent,180);return}
        chat.nameRound++;offerNameSuggestion(true);return
      }
      ai(`Jasne. Poprawmy ${fieldLabel(key)}. Napisz właściwą wersję, a najpierw ją potwierdzę.`)
    }
    function detectGlobalCorrection(t){
      const x=t.toLowerCase();if(/inna\s+nazwa|zmień\s+nazw|zmien\s+nazw|nie.*nazwa/.test(x)){chat.nameRound++;offerNameSuggestion(true);return true}
      const map=[['miast','city'],['obszar','city'],['usług','services'],['styl','style'],['telefon','phone'],['mail','email'],['e-mail','email'],['wyróż','usp'],['opis firmy','businessBrief'],['branż','businessBrief']];
      for(const [needle,key] of map){if((x.includes('zmień')||x.includes('zmien')||x.includes('popraw'))&&x.includes(needle)){chat.phase='ask';chat.pendingKey=key;chat.step=Math.max(0,questions.findIndex(q=>q.key===key));ai(`Okej — wracamy do pola „${fieldLabel(key)}”. Podaj nową wersję.`);return true}}return false
    }

    function renderDemo(save=false){
      const d=chat.data;const copy=siteCopy(d);const services=normalizeServices(d.services||'Profesjonalna obsługa, Indywidualna wycena, Szybka realizacja');const heroPhoto=d.photos[0]||d.projectPhotos[0]||'';const email=/pomiń/i.test(d.email||'')?'':d.email;const cls=themeClass(d.style);const layout=layoutClass(d);const domains=domainIdeas(d);const trust=trustItems(d);const why=whyCards(d);const extras=d.extras||[];
      const logo=d.logo?`<img class="demoLogo" src="${d.logo}" alt="Logo ${esc(d.company)}">`:`<span class="demoLogoFallback">${esc(initials(d.company))}</span>`;
      const gallery=d.photos.length?`<section class="demoSection alt" id="demo-realizacje"><div class="demoSectionTitleRow"><div><span class="demoEyebrow">Realizacje</span><h3>Zobacz wybrane realizacje</h3></div><div class="miniCopy">Kliknij zdjęcie — otworzy się pełnoekranowy pokaz slajdów dopasowany do telefonu, tabletu lub komputera.</div></div><div class="demoGallery">${d.photos.map((x,i)=>`<button type="button" class="demoGalleryItem" data-gallery-kind="realizations" data-gallery-index="${i}" aria-label="Powiększ realizację ${i+1}"><img src="${x}" alt="${esc(photoCaption(d,i))}"><span class="galleryZoomBadge">⛶ Powiększ</span></button>`).join('')}</div></section>`:'';
      const projects=d.projectPhotos.length?`<section class="demoSection" id="demo-projekty"><div class="demoSectionTitleRow"><div><span class="demoEyebrow">Projekty</span><h3>Projekty i wizualizacje</h3></div><div class="miniCopy">Koncepcje przed realizacją — klient może zobaczyć kierunek projektu jeszcze przed wykonaniem.</div></div><div class="projectGrid">${d.projectPhotos.map((x,i)=>`<button class="projectCard" type="button" data-gallery-kind="projects" data-gallery-index="${i}"><img src="${x}" alt="Projekt ${i+1}"><span class="projectCardBody"><b>Projekt ${String(i+1).padStart(2,'0')}</b><span>Kliknij, aby otworzyć pełny podgląd</span></span></button>`).join('')}</div></section>`:'';
      const faq=extras.some(x=>/faq/i.test(x))?`<section class="demoSection alt"><div class="demoSectionHead"><span class="demoEyebrow">FAQ</span><h3>Najczęstsze pytania</h3></div><div class="demoWhyCards"><div class="demoWhyCard"><b>Jak wygląda wycena?</b><span>Najpierw zbieramy zakres i potrzebne wymiary, a potem przedstawiamy konkretny kolejny krok.</span></div><div class="demoWhyCard"><b>Czy można zamówić usługę pod wymiar?</b><span>Tak — zakres dopasowujemy do konkretnego zlecenia i warunków na miejscu.</span></div><div class="demoWhyCard"><b>Jaki jest termin?</b><span>Termin zależy od zakresu. Po krótkiej rozmowie możemy podać realny przedział.</span></div></div></section>`:'';
      const priceSection=extras.some(x=>/cennik/i.test(x))?`<section class="demoSection"><div class="demoSectionHead"><span class="demoEyebrow">Wycena</span><h3>Cena zależy od zakresu</h3><p class="demoSectionLead">Zamiast przypadkowych widełek pokazujemy klientowi, od czego zależy koszt i kierujemy go do szybkiej wyceny.</p></div><div class="demoWhyCards"><div class="demoWhyCard"><b>Wymiary / zakres</b><span>Wpływają na ilość materiału i czas pracy.</span></div><div class="demoWhyCard"><b>Wykończenie</b><span>Rodzaj wykonania i dodatkowe opcje zmieniają końcową cenę.</span></div><div class="demoWhyCard"><b>Montaż</b><span>Warunki na miejscu uwzględniamy przed finalną wyceną.</span></div></div></section>`:'';
      const reviews=extras.some(x=>/opini/i.test(x))?`<section class="demoSection alt"><div class="demoSectionHead"><span class="demoEyebrow">Opinie</span><h3>Miejsce na opinie klientów</h3><p class="demoSectionLead">Po uruchomieniu możemy podpiąć prawdziwe opinie z Google lub dodać zweryfikowane referencje.</p></div></section>`:'';
      const about=`<section class="demoSection alt"><div class="demoWhy"><div><span class="demoEyebrow">O firmie</span><h3>${esc(d.company||'Poznaj nas bliżej')}</h3><p class="demoAboutText">${esc(aboutCopy(d))}</p><div class="demoWhyCards">${why.map(x=>`<div class="demoWhyCard"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div></div><div class="demoQuote"><b>${esc((businessFeatures(d)[0]||cleanUsp(d.usp)||'Dobra realizacja zaczyna się od dobrych ustaleń.'))}</b><p>${esc(d.city?`${d.city} + okolice. Najpierw ustalamy potrzebę, potem dobieramy rozwiązanie.`:'Najpierw ustalamy potrzebę, potem dobieramy rozwiązanie.')}</p><span class="quoteMeta">${esc(d.company||'Twoja firma')}</span></div></div></section>`;
      const servicesHtml=`<section class="demoSection" id="demo-uslugi"><div class="demoSectionHead"><span class="demoEyebrow">Oferta</span><h3>${esc(copy.servicesTitle)}</h3><p class="demoSectionLead">${esc(copy.servicesLead)}</p></div><div class="demoServices">${services.map((x,i)=>`<article class="demoService"><span class="demoServiceNo">${String(i+1).padStart(2,'0')}</span><h4>${esc(x)}</h4><p>${esc(serviceDesc(x,d.industry))}</p><span class="demoServiceTag">Zapytaj o wycenę</span></article>`).join('')}</div></section>`;
      const midSections=layout==='layout-showcase'?(gallery+projects+servicesHtml+about):(servicesHtml+about+gallery+projects);
      const navProjects=d.projectPhotos.length?'<a href="#demo-projekty">Projekty</a>':'';
      generatedSite.innerHTML=`<div class="clientDemo ${cls} ${layout}">
        <nav class="demoNav"><div class="demoBrand">${logo}<span>${esc(d.company||'Twoja Firma')}</span></div><div class="demoNavLinks"><a href="#demo-uslugi">Usługi</a><a href="#demo-realizacje">Realizacje</a>${navProjects}<span>O nas</span><a href="#demo-kontakt">Kontakt</a></div><span class="demoNavCta">Bezpłatna wycena</span></nav>
        <section class="demoSiteHero ${heroPhoto?'hasPhoto':''}">${heroPhoto?`<img class="demoHeroPhoto" src="${heroPhoto}" alt="${esc(d.company)}">`:''}<div class="demoHeroContent"><div class="demoKicker"><span class="demoPill">${esc(d.city||'Twoja okolica')}</span><span class="demoPill secondary">${esc(industryLabel(d.industry))}</span></div><h2>${esc(heroTitle(d))}</h2><p>${esc(heroLead(d))}</p><div class="demoHeroActions"><a class="demoCTA" href="#demo-kontakt">Poproś o wycenę</a>${d.photos.length?'<a class="demoCTA ghost" href="#demo-realizacje">Zobacz realizacje</a>':''}</div></div></section>
        <div class="demoTrust">${trust.map(x=>`<div class="demoTrustItem"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>
        ${midSections}${faq}${priceSection}${reviews}
        <div class="demoCtaBand"><div><h3>${esc(copy.ctaTitle)}</h3><p>${esc(copy.ctaLead)}</p></div><a class="demoCTA" href="#demo-kontakt">Skontaktuj się</a></div>
        <section class="demoContact" id="demo-kontakt"><div class="demoContactGrid"><div><span class="demoPill">Kontakt</span><h3>${esc(copy.contactTitle)}</h3><p>${esc(copy.contactLead)}</p><div class="demoContactList"><div class="demoContactItem"><b>Telefon</b><br>${esc(d.phone||'do uzupełnienia')}</div>${email?`<div class="demoContactItem"><b>E-mail</b><br>${esc(email)}</div>`:''}<div class="demoContactItem"><b>Obszar działania</b><br>${esc(d.city||'do uzupełnienia')} i okolice</div></div></div><form class="demoRealForm" data-demo-form><h4>Poproś o bezpłatną wycenę</h4><p class="formIntro">Zostaw kontakt i krótko opisz, czego potrzebujesz.</p><div class="demoField"><label>Imię i nazwisko</label><input name="name" required placeholder="Np. Jan Kowalski"></div><div class="demoField"><label>Telefon</label><input name="phone" required placeholder="Np. 500 000 000"></div><div class="demoField"><label>E-mail <span style="font-weight:500;color:#8693a0">(opcjonalnie)</span></label><input name="email" type="email" placeholder="Np. kontakt@firma.pl"></div><div class="demoField"><label>W czym możemy pomóc?</label><select name="service"><option value="">Wybierz usługę</option>${services.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="demoField"><label>Krótki opis zlecenia</label><textarea name="message" placeholder="Napisz np. wymiary, termin lub czego dokładnie potrzebujesz"></textarea></div><button class="demoCTA demoFormSubmit" type="submit">Wyślij zapytanie</button><div class="demoFormSuccess">✓ Demo: zgłoszenie zapisane jako lead w tej przeglądarce.</div></form></div></section>
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

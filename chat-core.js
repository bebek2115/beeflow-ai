(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BeeFlowChatCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const FIELD_KEYS=['company','businessBrief','industry','city','services','style','usp','phone','email','websiteUrl'];

  function normalizeText(value=''){
    return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9@._:/\-\s]/g,' ').replace(/\s+/g,' ').trim();
  }

  function extractWebsiteUrl(message=''){
    const text=String(message);
    const match=text.match(/\b((?:https?:\/\/|www\.)[^\s,;]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:pl|com|eu|net|org|io)(?:\/[^\s,;]*)?)/i);
    if(!match)return '';
    const cleaned=match[1].replace(/[.)!?]+$/,'');
    return /^https?:\/\//i.test(cleaned)?cleaned:`https://${cleaned}`;
  }

  function isGreeting(message=''){
    const text=normalizeText(message);
    return /^(czesc|czes|hej|hejka|dzien dobry|dobry wieczor|siema|witam|halo)( jak tam)?[.!]*$/.test(text);
  }

  function hasNoName(message=''){
    const normalized=normalizeText(message);
    if(/\b(?:nie mam|nie mamy|brak|bez) (?:jeszcze )?(?:nazwy|nazwe)(?: firmy)?\b/.test(normalized))return true;
    const compact=normalized.replace(/\s+/g,'');
    return ['niemamnazwy','niemanazwy','braknazwy','beznazwy','niemamynazwy','jeszczeniemamnazwy','nazwyjeszczeniemam']
      .some(value=>compact.includes(value));
  }

  function classifyIntent(message='',currentIntent=''){
    const text=normalizeText(message),url=extractWebsiteUrl(message);
    if(isGreeting(message))return 'clarify';
    const redesign=/(mam (juz )?strone|moja strona|istniejac[aey] stron|popraw|odswiez|przebud|redesign|zmien wyglad|nowa wersj|lepsz[aey] stron|audyt stron)/.test(text);
    if(redesign&&(url||currentIntent==='redesign_site'))return 'redesign_site';
    const create=/(zrob|zrub|stworz|stwu?rz|potrzebuje|chce|zbuduj).{0,28}(stron|witryn|landing)|\b(strona|strone|strony)\b.{0,20}\b(dla|firm)/.test(text);
    const business=/(robie|wykonuje|prowadz[eimy]*|zajmuje|sprowadzam|sprzedaje|oferuje|naprawiam|montuje|produkuje)\b/.test(text);
    if(create||business||hasNoName(message))return 'new_site';
    if(currentIntent==='new_site'||currentIntent==='redesign_site')return currentIntent;
    return url?'redesign_site':'clarify';
  }

  function normalizeCity(value=''){
    const city=String(value).trim().replace(/[.,!?]+$/,'');
    const key=normalizeText(city);
    const known={elblagu:'Elbląg',gdansku:'Gdańsk',warszawie:'Warszawa',krakowie:'Kraków',poznaniu:'Poznań',wroclawiu:'Wrocław',lodz:'Łódź',lodzi:'Łódź',olsztynie:'Olsztyn',sopocie:'Sopot',gdyni:'Gdynia'};
    if(known[key])return known[key];
    return city.charAt(0).toUpperCase()+city.slice(1);
  }

  function extractCity(message=''){
    const text=String(message);
    const patterns=[
      /\b(?:dzia(?:ł|l)am(?:y)?|pracuj(?:ę|e|emy)|firma jest|jeste(?:m|śmy|smy)|g(?:ł|l)ównie)\s+(?:w|na terenie)\s+([\p{L}-]+(?:\s+[\p{L}-]+)?)/iu,
      /\b(?:w|na terenie)\s+([A-ZŁŚŻŹĆŃÓ][\p{L}-]+(?:\s+[A-ZŁŚŻŹĆŃÓ][\p{L}-]+)?)/u,
      /\b(?:okolice|okolicach)\s+([A-ZŁŚŻŹĆŃÓ][\p{L}-]+)/u
    ];
    for(const pattern of patterns){
      const match=text.match(pattern);
      if(match)return normalizeCity(match[1]);
    }
    return '';
  }

  function detectIndustry(message=''){
    const text=normalizeText(message);
    const profiles=[
      [/(sprowadz|import).{0,18}(aut|samoch)|handel.{0,12}(aut|samoch)/,'Import i sprzedaż samochodów'],
      [/(bram|balustrad|ogrodzen|furt)/,'Bramy, balustrady i ogrodzenia'],
      [/(budow|remont|wykonczen|elewac|murars)/,'Usługi budowlane i remontowe'],
      [/(kosmetycz|beauty|paznok|manicure|rz[eę]s|brwi|fryzjer)/,'Beauty i kosmetyka'],
      [/(stomatolog|dentyst|gabinet dent)/,'Stomatologia'],
      [/(detail|powlo?ka ceramic|polerowan)/,'Detailing samochodowy'],
      [/(hydraul|instalacj.{0,8}wod)/,'Hydraulika i instalacje'],
      [/(elektryk|instalacj.{0,8}elek)/,'Usługi elektryczne'],
      [/(klimatyz|wentylac|rekuperac)/,'Klimatyzacja i wentylacja'],
      [/(sprzatan|mycie okien)/,'Usługi sprzątające'],
      [/(fotograf|sesj.{0,8}zdjec)/,'Fotografia'],
      [/(ksiegow|rachunkow)/,'Księgowość'],
      [/(transport|przeprowadzk|przewoz)/,'Transport i przeprowadzki'],
      [/(opieka.{0,12}dziec|zlob|przedszkol|nian)/,'Opieka nad dziećmi'],
      [/(restaurac|bistro|catering|pizzer|kawiar)/,'Gastronomia']
    ];
    return profiles.find(([pattern])=>pattern.test(text))?.[1]||'';
  }

  function extractServices(message=''){
    const text=normalizeText(message),services=[];
    const add=value=>{if(value&&!services.includes(value))services.push(value)};
    const map=[
      [/bram/,'Bramy na wymiar'],[/balustrad/,'Balustrady'],[/ogrodzen/,'Ogrodzenia'],[/furt/,'Furtki'],
      [/(sprowadz|import).{0,18}(aut|samoch)/,'Sprowadzanie samochodów'],[/sprzedaz.{0,12}(aut|samoch)/,'Sprzedaż samochodów'],
      [/remont/,'Remonty'],[/wykonczen/,'Wykończenia'],[/elewac/,'Elewacje'],
      [/manicure/,'Manicure'],[/paznok/,'Stylizacja paznokci'],[/brwi/,'Stylizacja brwi'],[/rz[eę]s/,'Stylizacja rzęs'],
      [/fotograf|sesj.{0,8}zdjec/,'Sesje fotograficzne'],[/sprzatan/,'Sprzątanie'],[/przeprowadzk/,'Przeprowadzki']
    ];
    map.forEach(([pattern,label])=>{if(pattern.test(text))add(label)});
    return services.slice(0,8);
  }

  function extractCompany(message=''){
    if(hasNoName(message))return '';
    const text=String(message);
    const patterns=[
      /\b(?:firma|marka|salon|studio)\s+(?:nazywa się|nazywa sie|to)\s+[„"]?([^,.!?„”"]{2,45})/i,
      /\b(?:nazwa firmy|nazywamy się|nazywamy sie)\s*(?:to|:)?\s*[„"]?([^,.!?„”"]{2,45})/i
    ];
    for(const pattern of patterns){const match=text.match(pattern);if(match)return match[1].trim()}
    return '';
  }

  function extractFields(message='',state={}){
    const intent=classifyIntent(message,state.intent||'');
    const fields={};
    const websiteUrl=extractWebsiteUrl(message),company=extractCompany(message),city=extractCity(message),industry=detectIndustry(message),services=extractServices(message);
    if(websiteUrl)fields.websiteUrl=websiteUrl;
    if(company)fields.company=company;
    if(city)fields.city=city;
    if(industry)fields.industry=industry;
    if(services.length)fields.services=services;
    if(hasNoName(message))fields.no_company_name=true;
    const text=normalizeText(message);
    if(/jasn|nowoczesn/.test(text))fields.style='Jasna i nowoczesna';
    else if(/ciem|premium/.test(text))fields.style='Ciemna i premium';
    else if(/sport|mocn/.test(text))fields.style='Mocna i sportowa';
    else if(/elegan|spokojn/.test(text))fields.style='Elegancka i spokojna';
    if(intent==='new_site'&&(/(robie|wykonuje|prowadz|zajmuje|sprowadz|sprzedaj|oferuj|napraw|montuj|produkuj)/.test(text)||industry))fields.businessBrief=String(message).trim();
    return fields;
  }

  function detectCorrections(message='',state={}){
    const text=normalizeText(message);
    if(!/(jednak|zmien|popraw|wroc|nie w |nie z |mialo byc|ma byc)/.test(text))return [];
    const fields=extractFields(message,state),corrections=[];
    for(const key of FIELD_KEYS){
      if(fields[key]!==undefined&&fields[key]!==''&&state[key]!==undefined&&String(state[key])!==String(fields[key])){
        corrections.push({field:key,value:fields[key],reason:'Użytkownik podał nową wersję informacji.'});
      }
    }
    return corrections;
  }

  function missingFields(state={},fields={}){
    const merged={...state,...fields};
    if(Array.isArray(merged.services))merged.services=merged.services.join(', ');
    const missing=[];
    if(!merged.businessBrief&&!merged.industry)missing.push('businessBrief');
    if(!merged.city)missing.push('city');
    if(!merged.services)missing.push('services');
    if(!merged.style)missing.push('style');
    if(!merged.phone)missing.push('phone');
    if(!merged.email)missing.push('email');
    return missing;
  }

  function localFallback(message,state={}){
    const intent=classifyIntent(message,state.intent||''),extracted_fields=extractFields(message,{...state,intent});
    const corrections=detectCorrections(message,state),missing_fields=missingFields(state,extracted_fields);
    let reply='Powiedz proszę, czy chcesz stworzyć nową stronę, czy poprawić już istniejącą.';
    let next_action='ask_intent';
    if(isGreeting(message))reply='Cześć 👋 Jasne — chcesz stworzyć nową stronę czy poprawić obecną?';
    else if(intent==='new_site'){
      const parts=[];
      if(extracted_fields.industry)parts.push(`branża: ${extracted_fields.industry.toLowerCase()}`);
      if(extracted_fields.city)parts.push(`okolice: ${extracted_fields.city}`);
      if(extracted_fields.services?.length)parts.push(`usługi: ${extracted_fields.services.join(', ')}`);
      reply=parts.length?`Dobra, kumam 😄 Mam już ${parts.join(' • ')}.${extracted_fields.no_company_name?' Spoko, nazwę możemy ogarnąć razem.':''}`:'Dobra, zróbmy nową stronę. Opowiedz krótko, czym zajmuje się firma.';
      next_action='start_legacy';
    }else if(intent==='redesign_site'){
      reply=extracted_fields.websiteUrl?'Jasne, widzę adres. Analiza strony wymaga połączenia z AI, więc teraz opisz proszę, co najbardziej chcesz w niej poprawić.':'Podeślij adres obecnej strony, a sprawdzę jej treść i strukturę.';
      next_action=extracted_fields.websiteUrl?'request_manual_redesign_context':'ask_website_url';
    }
    return {intent,reply,extracted_fields,corrections,missing_fields,confidence:intent==='clarify'?0.55:0.78,next_action,
      confirmation:{required:false,field:'',value:'',reason:''},
      page_analysis:{available:false,source_url:extracted_fields.websiteUrl||'',title:'',strengths:[],problems:[],recommendations:[],direction:'',visual_analysis_performed:false},
      fallback:true};
  }

  function applyResultToState(state,result){
    const next={...state},fields=result?.extracted_fields||{};
    for(const key of FIELD_KEYS){
      if(fields[key]===undefined||fields[key]===null||fields[key]==='')continue;
      next[key]=key==='services'&&Array.isArray(fields[key])?fields[key].join(', '):fields[key];
    }
    for(const correction of result?.corrections||[]){
      if(!FIELD_KEYS.includes(correction.field))continue;
      next[correction.field]=Array.isArray(correction.value)?correction.value.join(', '):correction.value;
    }
    return next;
  }

  return {FIELD_KEYS,normalizeText,extractWebsiteUrl,isGreeting,hasNoName,classifyIntent,extractCity,detectIndustry,extractServices,extractCompany,extractFields,detectCorrections,missingFields,localFallback,applyResultToState};
});

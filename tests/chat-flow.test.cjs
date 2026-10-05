const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Small DOM stand-in for conversation state tests; this does not test browser layout.
function createApp(options={}){
  let document;
  class Element{
    constructor(tag='div'){
      this.tagName=tag.toUpperCase();this.children=[];this.className='';this.attributes={};
      this.value='';this.disabled=false;this.style={setProperty(){}};this.listeners={};
      this.dataset={};this.scrollHeight=0;this.textContent='';this._html='';
      const classes=()=>new Set(this.className.split(/\s+/).filter(Boolean));
      this.classList={
        contains:name=>classes().has(name),
        add:(...names)=>{this.className=[...new Set([...classes(),...names])].join(' ')},
        remove:(...names)=>{this.className=[...classes()].filter(x=>!names.includes(x)).join(' ')},
        toggle:(name,force)=>{const on=force===undefined?!classes().has(name):force;this.classList[on?'add':'remove'](name);return on}
      };
    }
    set innerHTML(value){this._html=value;this.children=[]}
    get innerHTML(){return this._html}
    get lastElementChild(){return this.children.at(-1)}
    appendChild(child){child.parentElement=this;this.children.push(child);return child}
    setAttribute(key,value){this.attributes[key]=String(value)}
    getAttribute(key){return this.attributes[key]}
    addEventListener(name,callback){(this.listeners[name]??=[]).push(callback)}
    focus(){document.activeElement=this}
    click(){if(!this.disabled)this.onclick?.({preventDefault(){},target:this})}
    querySelectorAll(selector){
      const descendants=[];
      const visit=node=>{for(const child of node.children){descendants.push(child);visit(child)}};
      visit(this);
      if(selector==='.quick button, .confirmRow button')return descendants.filter(el=>el.tagName==='BUTTON'&&['quick','confirmRow'].some(cls=>el.parentElement.classList.contains(cls)));
      return [];
    }
    querySelector(){return null}
  }
  const root=path.resolve(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const elements=new Map();
  for(const match of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const el=new Element(match[1]);
    el.className=match[0].match(/\bclass="([^"]*)"/)?.[1]||'';
    elements.set(match[2],el);
  }
  const opener=new Element('a');
  document={
    body:new Element('body'),documentElement:new Element('html'),activeElement:opener,
    getElementById:id=>elements.get(id)||null,
    createElement:tag=>new Element(tag),
    querySelectorAll:selector=>selector==='.js-open-chat'?[opener]:[],
    querySelector:selector=>selector==='.js-open-chat'?opener:null,
    addEventListener(){}
  };
  let clock=0;
  const timers=[];
  const saved=new Map();
  const browserWindow={innerWidth:390,innerHeight:844,addEventListener(){}};
  if(options.smart){
    browserWindow.BeeFlowChatCore=require('../chat-core.js');
    browserWindow.BeeFlowAIClient={send:options.aiSend||(()=>Promise.reject(new Error('offline')))};
  }
  const context=vm.createContext({
    document,console,window:browserWindow,
    location:{hash:'',pathname:'/',search:''},history:{replaceState(){}},
    setTimeout(fn,ms=0){timers.push({fn,time:clock+ms});return timers.length},
    requestAnimationFrame:fn=>fn(),
    localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},
    btoa:value=>Buffer.from(value,'binary').toString('base64'),
    alert:message=>{throw new Error(message)},confirm:()=>true
  });
  for(const name of ['config.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
  const run=code=>vm.runInContext(code,context);
  const flush=()=>{
    let count=0;
    while(timers.length){
      assert.ok(count++<100,'conversation timers must settle');
      timers.sort((a,b)=>a.time-b.time);
      const timer=timers.shift();clock=timer.time;timer.fn();
    }
  };
  const send=(text,wait=true)=>{run(`submitMessage(${JSON.stringify(text)})`);if(wait)flush()};
  const settle=async()=>{for(let i=0;i<8;i++){await Promise.resolve();flush()}};
  const buttons=()=>elements.get('msgs').querySelectorAll('.quick button, .confirmRow button');
  const click=text=>{
    const button=buttons().findLast(el=>el.textContent===text&&!el.disabled);
    assert.ok(button,`active button: ${text}`);button.click();flush();return button;
  };
  run('openMainChat()');flush();
  return {run,flush,send,settle,buttons,click,elements,document};
}

function reachIndustry(app,company='Czarnota'){
  app.send(company);app.click('Tak, zgadza się');
  app.send('Wykonujemy bramy i ogrodzenia');app.click('Tak, zgadza się');
}

test('an old confirmation cannot accept a different answer',()=>{
  const app=createApp();app.send('Czarnota');
  const old=app.click('Tak, zgadza się');
  app.send('Wykonujemy bramy i ogrodzenia');
  old.onclick();app.flush();
  assert.equal(app.run('chat.phase'),'confirm');
  assert.equal(app.run('chat.data.businessBrief'),'');
  assert.equal(old.disabled,true);
});

test('a manual industry correction takes priority over the original description',()=>{
  const app=createApp();reachIndustry(app);
  app.send('Szklarnie ogrodowe');
  assert.equal(app.run('chat.data.industry'),'Szklarnie ogrodowe');
  app.click('Tak, dokładnie');
  assert.equal(app.run('chat.industryConfirmed'),true);
  assert.equal(app.run('chat.pendingKey'),'city');
});

test('an old industry choice cannot rewind a later question',()=>{
  const app=createApp();reachIndustry(app);
  const old=app.buttons().findLast(el=>el.textContent==='Nie — popraw branżę');
  app.click('Tak, dokładnie');app.send('Elbląg');
  old.onclick();app.flush();
  assert.equal(app.run('chat.phase'),'confirm');
  assert.equal(app.run('chat.pendingKey'),'city');
});

test('the corrected industry also controls page copy and name suggestions',()=>{
  const app=createApp();reachIndustry(app);
  app.send('Salon kosmetyczny');app.click('Tak, dokładnie');
  assert.equal(app.run('categoryKey()'),'beauty');
  assert.equal(app.run('actionLabel(chat.data)'),'Umów wizytę');
  assert.equal(app.run('INDUSTRY_PROFILES.beauty.names.includes(contextualNameSuggestions()[0])'),true);
  assert.ok(app.run('nameReason()').includes('Beauty i kosmetyka'));
});

test('reset cancels pending messages and choices from the previous conversation',()=>{
  const app=createApp();app.send('Czarnota',false);
  app.run('resetChat()');app.flush();
  assert.equal(app.run('chat.pendingKey'),'company');
  assert.equal(app.buttons().length,0);
  assert.equal(app.elements.get('msgs').children.some(el=>el.innerHTML.includes('Czarnota')),false);
});

test('rapid typed answers retain the industry confirmation step',()=>{
  const app=createApp();
  for(const text of ['Czarnota','tak','Wykonujemy bramy i ogrodzenia','tak'])app.send(text,false);
  assert.equal(app.run('chat.phase'),'industry-confirm');
  app.flush();
  assert.equal(app.buttons().filter(el=>!el.disabled).length,2);
});

test('no name leads to a proposal without losing the confirmed industry',()=>{
  const app=createApp();app.send('nie mam nazwy');
  app.send('Prowadzę salon kosmetyczny');app.click('Tak, zgadza się');
  app.click('Tak, dokładnie');
  assert.equal(app.run('chat.phase'),'naming');
  app.click('Pokaż inną nazwę');
  const proposed=app.run('chat.lastSuggestedName');
  app.click('Tak, ta nazwa pasuje');app.click('Tak, zgadza się');
  assert.equal(app.run('chat.data.company'),proposed);
  assert.equal(app.run('chat.pendingKey'),'city');
  assert.equal(app.run('chat.industryConfirmed'),true);
});

test('returning from the preview reopens the creator with its existing data',()=>{
  const app=createApp();reachIndustry(app);app.click('Tak, dokładnie');
  for(const text of ['Elbląg','Bramy, furtki','Ciemna i premium','pomiń','500600700','pomiń']){
    app.send(text);app.click('Tak, zgadza się');
  }
  assert.equal(app.run('chat.phase'),'extras');
  // Rendering is exercised; file inputs and layout require a real browser.
  app.run('generateDemo()');app.flush();
  assert.equal(app.elements.get('previewOverlay').classList.contains('show'),true);
  assert.equal(app.elements.get('chatbox').classList.contains('open'),false);
  app.elements.get('backToChat').click();app.flush();
  assert.equal(app.elements.get('previewOverlay').classList.contains('show'),false);
  assert.equal(app.elements.get('chatbox').classList.contains('open'),true);
  assert.equal(app.elements.get('chatBackdrop').getAttribute('aria-hidden'),'false');
  assert.equal(app.document.body.classList.contains('chat-open'),true);
  assert.equal(app.run('chat.data.company'),'Czarnota');
});

test('AI failure activates the legacy creator without losing fields extracted from the first message',async()=>{
  const app=createApp({smart:true,aiSend:()=>Promise.reject(Object.assign(new Error('offline'),{code:'AI_UNAVAILABLE'}))});
  assert.equal(app.run('chat.phase'),'router');
  assert.equal(app.run('chat.pendingKey'),null);
  app.send('Robię bramy i balustrady pod wymiar w Elblągu, nazwy jeszcze nie mam.',false);
  await app.settle();
  assert.equal(app.run('smartChat.legacyStarted'),true);
  assert.equal(app.run('chat.data.city'),'Elbląg');
  assert.equal(app.run('chat.data.services'),'Bramy na wymiar, Balustrady');
  assert.equal(app.run('chat.needsName'),true);
  assert.equal(app.run('chat.phase'),'naming');
});

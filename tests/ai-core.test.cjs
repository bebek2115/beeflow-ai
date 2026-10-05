const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
  AI_RESPONSE_SCHEMA,isPrivateAddress,validatePublicUrl,extractPageSnapshot,fetchPublicWebsite,
  callOpenAI,processAIRequest
}=require('../api/_lib/ai-core.cjs');

function headers(values={}){const normalized=Object.fromEntries(Object.entries(values).map(([key,value])=>[key.toLowerCase(),value]));return {get:key=>normalized[String(key).toLowerCase()]||null}}
function jsonResponse(value,status=200,extraHeaders={}){return {ok:status>=200&&status<300,status,headers:headers({'content-type':'application/json',...extraHeaders}),json:async()=>value,text:async()=>JSON.stringify(value)}}
function textResponse(value,status=200,extraHeaders={}){return {ok:status>=200&&status<300,status,headers:headers({'content-type':'text/html; charset=utf-8',...extraHeaders}),text:async()=>value}}

function validModelResult(overrides={}){
  return {
    intent:'new_site',reply:'Dobra, kumam 😄',
    extracted_fields:{company:null,businessBrief:null,industry:null,city:null,services:[],style:null,usp:null,phone:null,email:null,websiteUrl:null,no_company_name:false},
    corrections:[],missing_fields:['businessBrief'],confidence:.92,next_action:'ask_question',
    confirmation:{required:false,field:'',value:'',reason:''},
    page_analysis:{available:false,source_url:'',title:'',strengths:[],problems:[],recommendations:[],direction:'',visual_analysis_performed:false},
    ...overrides
  };
}

test('structured output schema requires every top-level contract field',()=>{
  assert.deepEqual(AI_RESPONSE_SCHEMA.required,['intent','reply','extracted_fields','corrections','missing_fields','confidence','next_action','confirmation','page_analysis']);
  assert.equal(AI_RESPONSE_SCHEMA.additionalProperties,false);
});

test('private and local network targets are rejected',async()=>{
  for(const url of ['http://127.0.0.1','http://localhost','http://10.0.0.5','http://[::1]','https://example.com:8443','http://example.com:443','https://example.com:80']){
    await assert.rejects(()=>validatePublicUrl(url,{lookup:async()=>[{address:'93.184.216.34',family:4}]}),error=>error.code==='URL_BLOCKED');
  }
  assert.equal(isPrivateAddress('192.168.1.10'),true);
  assert.equal(isPrivateAddress('93.184.216.34'),false);
});

test('a hostname resolving to a private IP is rejected',async()=>{
  await assert.rejects(()=>validatePublicUrl('https://example.com',{lookup:async()=>[{address:'169.254.169.254',family:4}]}),error=>error.code==='URL_BLOCKED');
});

test('website extraction reads text structure and never claims visual analysis',()=>{
  const snapshot=extractPageSnapshot('<html><head><title>Evocatio</title><meta name="description" content="Opis firmy"></head><body><nav>Start Oferta Kontakt</nav><h1>Dobry nagłówek</h1><h2>Oferta</h2><p>Treść strony.</p></body></html>','https://evocatio.pl/');
  assert.equal(snapshot.title,'Evocatio');
  assert.deepEqual(snapshot.headings.h1,['Dobry nagłówek']);
  assert.deepEqual(snapshot.navigation,['Start Oferta Kontakt']);
  assert.equal(snapshot.visual_analysis_performed,false);
});

test('public fetch validates redirects and returns a page snapshot',async()=>{
  const seen=[];
  const page=await fetchPublicWebsite('https://example.com',{lookup:async()=>[{address:'93.184.216.34',family:4}],fetchImpl:async url=>{
    seen.push(url);
    if(seen.length===1)return {ok:false,status:302,headers:headers({location:'/home'})};
    return textResponse('<title>Example</title><h1>Home</h1>');
  }});
  assert.equal(seen.length,2);
  assert.equal(page.url,'https://example.com/home');
  assert.equal(page.title,'Example');
});

test('OpenAI request uses server key and Responses structured output',async()=>{
  let request;
  const expected=validModelResult();
  const result=await callOpenAI({message:'Cześć'},{apiKey:'server-only-test-key',model:'test-model',fetchImpl:async(url,options)=>{
    request={url,options,body:JSON.parse(options.body)};
    return jsonResponse({output:[{content:[{type:'output_text',text:JSON.stringify(expected)}]}]});
  }});
  assert.equal(result.reply,expected.reply);
  assert.equal(request.url,'https://api.openai.com/v1/responses');
  assert.equal(request.options.headers.Authorization,'Bearer server-only-test-key');
  assert.equal(request.body.text.format.type,'json_schema');
  assert.equal(request.body.text.format.strict,true);
  assert.equal(JSON.stringify(request.body).includes('server-only-test-key'),false);
});

test('redesign request fetches public HTML and forces text-only analysis disclosure',async()=>{
  let modelContext;
  const modelResult=validModelResult({intent:'redesign_site',reply:'Mam analizę.',next_action:'analysis_complete',extracted_fields:{...validModelResult().extracted_fields,websiteUrl:'https://example.com'},page_analysis:{available:true,source_url:'https://example.com',title:'Example',strengths:['Jasny tytuł'],problems:['Brak konkretnego CTA'],recommendations:['Dodać CTA'],direction:'Prostsza strona usługowa',visual_analysis_performed:true}});
  const result=await processAIRequest({message:'Mam stronę example.com i chcę ją poprawić',state:{},history:[]},{
    lookup:async()=>[{address:'93.184.216.34',family:4}],
    pageFetchImpl:async()=>textResponse('<title>Example</title><h1>Usługi</h1><p>Kontakt</p>'),
    apiKey:'test-key',model:'test-model',fetchImpl:async(url,options)=>{
      modelContext=JSON.parse(JSON.parse(options.body).input);
      return jsonResponse({output:[{content:[{type:'output_text',text:JSON.stringify(modelResult)}]}]});
    }
  });
  assert.equal(modelContext.page_snapshot.title,'Example');
  assert.equal(result.intent,'redesign_site');
  assert.equal(result.page_analysis.visual_analysis_performed,false);
});

test('missing API key yields a controlled fallback error',async()=>{
  await assert.rejects(()=>callOpenAI({message:'test'},{apiKey:''}),error=>error.code==='AI_NOT_CONFIGURED'&&error.status===503);
});

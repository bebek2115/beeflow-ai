const {test}=require('node:test');
const assert=require('node:assert/strict');
const ChatCore=require('../chat-core.js');

test('„Cześć” is a greeting and not a company name',()=>{
  const result=ChatCore.localFallback('Cześć',{});
  assert.equal(result.intent,'clarify');
  assert.equal(result.extracted_fields.company,undefined);
  assert.equal(result.next_action,'ask_intent');
});

test('a request for a new construction company website is routed to new_site',()=>{
  const result=ChatCore.localFallback('Zrób mi stronę dla firmy budowlanej',{});
  assert.equal(result.intent,'new_site');
  assert.equal(result.extracted_fields.industry,'Usługi budowlane i remontowe');
  assert.equal(result.next_action,'start_legacy');
});

test('an existing website URL with an improvement request is routed to redesign_site',()=>{
  const result=ChatCore.localFallback('Mam stronę evocatio.pl i chcę ją poprawić',{});
  assert.equal(result.intent,'redesign_site');
  assert.equal(result.extracted_fields.websiteUrl,'https://evocatio.pl');
  assert.equal(result.page_analysis.visual_analysis_performed,false);
});

test('no company name is extracted as an explicit state, not as a name',()=>{
  const result=ChatCore.localFallback('Nie mam jeszcze nazwy firmy, prowadzę salon kosmetyczny',{});
  assert.equal(result.intent,'new_site');
  assert.equal(result.extracted_fields.no_company_name,true);
  assert.equal(result.extracted_fields.company,undefined);
  assert.equal(result.extracted_fields.industry,'Beauty i kosmetyka');
});

test('several facts are extracted from one message',()=>{
  const result=ChatCore.localFallback('Robię bramy i balustrady pod wymiar w Elblągu, nazwy jeszcze nie mam.',{});
  assert.equal(result.intent,'new_site');
  assert.equal(result.extracted_fields.industry,'Bramy, balustrady i ogrodzenia');
  assert.deepEqual(result.extracted_fields.services,['Bramy na wymiar','Balustrady']);
  assert.equal(result.extracted_fields.city,'Elbląg');
  assert.equal(result.extracted_fields.no_company_name,true);
  assert.ok(!result.missing_fields.includes('city'));
  assert.ok(!result.missing_fields.includes('services'));
});

test('common typos do not break new-site routing',()=>{
  const result=ChatCore.localFallback('Zrub mi strone dla salonu kosmetycznego',{});
  assert.equal(result.intent,'new_site');
  assert.equal(result.extracted_fields.industry,'Beauty i kosmetyka');
});

test('an explicit correction replaces an earlier field',()=>{
  const state={intent:'new_site',city:'Elbląg',industry:'Usługi budowlane i remontowe'};
  const result=ChatCore.localFallback('Jednak działam w Gdańsku',state);
  assert.deepEqual(result.corrections.map(item=>[item.field,item.value]),[['city','Gdańsk']]);
  const next=ChatCore.applyResultToState(state,result);
  assert.equal(next.city,'Gdańsk');
});

test('local fallback keeps the old creator available when the AI API fails',()=>{
  const result=ChatCore.localFallback('Robię remonty w Elblągu',{});
  assert.equal(result.fallback,true);
  assert.equal(result.next_action,'start_legacy');
  assert.equal(result.intent,'new_site');
});

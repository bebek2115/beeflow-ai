const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/ai.js');

function response(){
  return {statusCode:200,headers:{},payload:null,setHeader(key,value){this.headers[key]=value},status(code){this.statusCode=code;return this},json(value){this.payload=value;return this}};
}

test('/api/ai only accepts POST',async()=>{
  const res=response();await handler({method:'GET'},res);
  assert.equal(res.statusCode,405);
  assert.equal(res.headers.Allow,'POST');
});

test('/api/ai returns a controlled error when server model key is missing',async()=>{
  const previous=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
  try{
    const res=response();await handler({method:'POST',body:{message:'Cześć',state:{},history:[]}},res);
    assert.equal(res.statusCode,503);
    assert.equal(res.payload.error,'AI_NOT_CONFIGURED');
    assert.match(res.payload.message,/tryb lokalny/i);
  }finally{if(previous!==undefined)process.env.OPENAI_API_KEY=previous}
});

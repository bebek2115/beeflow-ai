const {processAIRequest}=require('./_lib/ai-core.cjs');

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'METHOD_NOT_ALLOWED',message:'Użyj metody POST.'});
  }
  try{
    const result=await processAIRequest(req.body);
    return res.status(200).json(result);
  }catch(error){
    const status=Number.isInteger(error?.status)?error.status:500;
    if(status>=500)console.error('BeeFlow /api/ai:',error?.code||'INTERNAL_ERROR',error?.requestId||'');
    return res.status(status).json({error:error?.code||'INTERNAL_ERROR',message:status>=500?'Asystent AI jest chwilowo niedostępny. Włączam tryb lokalny.':error.message});
  }
};

(function(root){
  async function send(payload){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch('/api/ai',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        signal:controller.signal
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        const error=new Error(data.message||'AI request failed');
        error.code=data.error||`HTTP_${response.status}`;
        throw error;
      }
      if(!data||!['new_site','redesign_site','clarify'].includes(data.intent)||typeof data.reply!=='string')throw new Error('Invalid AI response');
      return data;
    }finally{clearTimeout(timeout)}
  }
  root.BeeFlowAIClient={send};
})(window);

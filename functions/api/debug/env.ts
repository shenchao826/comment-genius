export const onRequestGet:PagesFunction<Env>=async({env})=>{
  const vars:{string:string|undefined}={};
  const names=['QWEN_API_KEY','SUPABASE_URL','SUPABASE_KEY'];
  for(const n of names){
    let v;try{v=(env as any)[n];}catch{v='THROW';}
    vars[n]=typeof v==='string'?`${v.substring(0,20)}...`:(v===undefined?'UNDEFINED':String(v).substring(0,50));
  }
  return Response.json({env_vars:vars,has_QWEN:!!(env as any).QWEN_API_KEY});
};

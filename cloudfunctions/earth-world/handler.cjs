const crypto=require('node:crypto');
const Core=require('./world-core.cjs');
function createHandler(app){
  return async event=>{
    try{
      // Identity comes only from CloudBase's authenticated invocation context.
      const {uid,isAnonymous}=app.auth().getUserInfo();
      if(!uid||isAnonymous)return {ok:false,code:'UNAUTHENTICATED'};
      const {userInfo}=await app.auth().getEndUserInfo(uid);
      // Enable email OTP only in the environment. EndUserInfo does not expose emailVerified.
      if(!userInfo?.email||userInfo.uid!==uid)return {ok:false,code:'EMAIL_REQUIRED'};
      if(!event||!['read','write'].includes(event.action))return {ok:false,code:'INVALID_ACTION'};
      if(event.action==='write'&&(!Number.isSafeInteger(event.revision)||event.revision<0))return {ok:false,code:'INVALID_REVISION'};
      const incoming=event.action==='write'?Core.validate(event.world):null;
      const docId=crypto.createHash('sha256').update(uid).digest('hex');
      const response=await app.database().runTransaction(async tx=>{
        const ref=tx.collection('earth_worlds').doc(docId);
        const found=await ref.get();
        const stored=Array.isArray(found.data)?found.data[0]:found.data;
        const current=stored?{revision:stored.revision,world:Core.validate(stored.world)}:{revision:0,world:Core.empty()};
        if(event.action==='read')return {ok:true,...current};
        if(event.revision!==current.revision)return {ok:true,conflict:true,...current};
        const next={revision:current.revision+1,world:incoming};
        await ref.set({...next,ownerUid:uid,updatedAt:Date.now()});
        return {ok:true,...next};
      });
      return response;
    }catch(error){
      const known=['INVALID_WORLD','WORLD_LIMIT','INVALID_ID','INVALID_TITLE','INVALID_FIELD'];
      return {ok:false,code:known.includes(error.message)?error.message:'SYNC_FAILED'};
    }
  };
}
module.exports={createHandler};

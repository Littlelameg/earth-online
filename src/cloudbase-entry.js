import cloudbase from '@cloudbase/js-sdk';
window.createEarthCloud = config => {
  const app=cloudbase.init({env:config.env,region:config.region});
  const auth=app.auth({persistence:'local'});
  const unwrap=result=>{if(result.error)throw result.error;return result.data;};
  return {
    session:async()=>unwrap(await auth.getSession()).session||null,
    send:async email=>{
      const data=unwrap(await auth.signInWithOtp({email,options:{shouldCreateUser:true}}));
      if(typeof data.verifyOtp!=='function')throw Error('OTP_UNAVAILABLE');
      return async token=>{const verified=unwrap(await data.verifyOtp({token}));if(!verified.session?.user?.id)throw Error('SESSION_MISSING');return verified.session;};
    },
    signOut:async()=>{const result=await auth.signOut();if(result.error)throw result.error;},
    watch:callback=>auth.onAuthStateChange(callback),
    world:async data=>{
      const response=await app.callFunction({name:config.functionName,data});
      const result=response.result;
      if(!result||!result.ok)throw Error(result?.code||'SYNC_FAILED');
      return result;
    }
  };
};

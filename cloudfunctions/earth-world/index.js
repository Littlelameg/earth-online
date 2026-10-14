const cloudbase=require('@cloudbase/node-sdk');
const {createHandler}=require('./handler.cjs');
const app=cloudbase.init({env:cloudbase.SYMBOL_CURRENT_ENV});
exports.main=createHandler(app);

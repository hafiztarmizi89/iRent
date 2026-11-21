'use strict';
// Pembungkus desktop (Windows .exe / Mac .dmg). Menjalankan pelayan yang sama dalam aplikasi.
const {app,BrowserWindow,Menu,shell,dialog,clipboard}=require('electron');
const path=require('path'),fs=require('fs'),os=require('os'),crypto=require('crypto');
const pref=path.join(app.getPath('userData'),'location.json');
const readLoc=()=>{try{return JSON.parse(fs.readFileSync(pref,'utf8')).dataDir}catch(e){return null}};
const saveLoc=d=>{fs.mkdirSync(path.dirname(pref),{recursive:true});fs.writeFileSync(pref,JSON.stringify({dataDir:d}))};
const dataDir=process.env.SEWA_DATA_DIR||readLoc()||path.join(app.getPath('documents'),'SewaBilik');
const cfgFile=path.join(dataDir,'config','config.json'),lockFile=path.join(dataDir,'database','.lock');
let win,srv,port,lockTimer;
const cfg=()=>JSON.parse(fs.readFileSync(cfgFile,'utf8'));

function ensureData(){ // struktur folder yang sama pada semua peranti
  for(const d of ['config','database','attachments'])fs.mkdirSync(path.join(dataDir,d),{recursive:true});
  if(!fs.existsSync(cfgFile))fs.writeFileSync(cfgFile,JSON.stringify({
    server:{host:'0.0.0.0',port:3000,accessPassword:crypto.randomBytes(6).toString('hex')},
    database:{type:'json',path:'./database/rental-db.json',seedDemoData:true},
    attachments:{path:'./attachments',maxFileSizeMB:10,allowed:['.pdf','.jpg','.jpeg']}},null,2));
}
function checkLock(){ // elak dua peranti menggunakan folder data yang sama serentak
  try{const l=JSON.parse(fs.readFileSync(lockFile,'utf8'));
    if(Date.now()-l.ts<30000&&l.host!=os.hostname())return dialog.showMessageBoxSync({type:'warning',buttons:['Batal','Teruskan juga'],defaultId:0,cancelId:0,
      title:'Folder data sedang digunakan',message:'Folder data ini sedang digunakan oleh peranti lain ('+l.host+').',
      detail:'Menggunakan folder yang sama serentak boleh merosakkan data. Tutup aplikasi pada peranti itu dahulu.'})==1}catch(e){}
  return true;
}
function holdLock(){const w=()=>{try{fs.writeFileSync(lockFile,JSON.stringify({host:os.hostname(),ts:Date.now()}))}catch(e){}};w();lockTimer=setInterval(w,10000)}
function dropLock(){clearInterval(lockTimer);try{if(JSON.parse(fs.readFileSync(lockFile,'utf8')).host==os.hostname())fs.unlinkSync(lockFile)}catch(e){}}
function lanUrls(){return Object.values(os.networkInterfaces()).flat().filter(i=>i.family=='IPv4'&&!i.internal).map(i=>'http://'+i.address+':'+port)}
function info(){
  const t=lanUrls().join('\n')||'(tiada rangkaian dikesan)',pw=cfg().server.accessPassword||'(tiada)';
  const r=dialog.showMessageBoxSync(win,{type:'info',buttons:['Tutup','Salin alamat'],title:'Maklumat sambungan',message:'Buka alamat ini di iPhone atau komputer lain (Wi-Fi yang sama):',
    detail:t+'\n\nKata laluan akses: '+pw+'\n(nama pengguna: apa sahaja)\n\nFolder data: '+dataDir});
  if(r==1)clipboard.writeText(lanUrls()[0]||'');
}
function changeDir(){
  const r=dialog.showOpenDialogSync(win,{title:'Pilih folder data (mengandungi config, database, attachments)',properties:['openDirectory','createDirectory']});
  if(r&&r[0]){saveLoc(r[0]);dropLock();app.relaunch();app.exit(0)}
}
function menu(){Menu.setApplicationMenu(Menu.buildFromTemplate([
  ...(process.platform=='darwin'?[{role:'appMenu'}]:[]),
  {label:'Fail',submenu:[{label:'Buka folder data',click:()=>shell.openPath(dataDir)},{label:'Tukar folder data...',click:changeDir},
    {label:'Maklumat sambungan (iPhone / peranti lain)',click:info},{type:'separator'},{role:'quit',label:'Keluar'}]},
  {role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}]))}
function openWin(){
  const origin='http://127.0.0.1:'+port;
  win=new BrowserWindow({width:1280,height:860,title:'Sistem Sewa Bilik',webPreferences:{contextIsolation:true,nodeIntegration:false}});
  win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith(origin))return{action:'allow'};shell.openExternal(url);return{action:'deny'}});
  win.loadURL(origin);
}
app.on('login',(e,wc,req,auth,cb)=>{if(auth.host=='127.0.0.1'){e.preventDefault();cb('admin',cfg().server.accessPassword)}});
async function boot(){
  try{ensureData();if(!checkLock())return app.quit();holdLock();process.env.SEWA_DATA_DIR=dataDir;
    ({server:srv,port}=await require('../app/server.js').start());menu();openWin();
  }catch(e){dialog.showErrorBox('Gagal memulakan sistem',String(e&&e.message||e));app.quit()}
}
if(!app.requestSingleInstanceLock())app.quit();
else{app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});app.whenReady().then(boot)}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{dropLock();if(srv)srv.close()});

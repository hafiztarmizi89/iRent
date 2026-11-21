'use strict';
// Sistem Sewa Bilik - pelayan tanpa kebergantungan luar (Node.js 18+).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const ROOT=__dirname,DATA=process.env.SEWA_DATA_DIR||ROOT,CFG=path.join(DATA,'config','config.json'); // DATA = folder data (config, database, attachments) boleh dialihkan
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'};
let cfg,dbFile,attDir,db;
const abs=p=>path.isAbsolute(p)?p:path.resolve(DATA,p);
const readCfg=()=>{cfg=JSON.parse(fs.readFileSync(CFG,'utf8'))};
function init(){ // titik ke pangkalan data dan folder lampiran mengikut config.json
  dbFile=abs(cfg.database.path);attDir=abs(cfg.attachments.path);
  fs.mkdirSync(path.dirname(dbFile),{recursive:true});fs.mkdirSync(attDir,{recursive:true});
  if(!fs.existsSync(dbFile))fs.writeFileSync(dbFile,JSON.stringify({rev:0,data:null}));
  db=JSON.parse(fs.readFileSync(dbFile,'utf8'));
}
function saveDb(){
  const dir=path.join(path.dirname(dbFile),'backup'),day=new Date().toISOString().slice(0,10),bk=path.join(dir,'db-'+day+'.json');
  fs.mkdirSync(dir,{recursive:true});
  if(fs.existsSync(dbFile)&&!fs.existsSync(bk))fs.copyFileSync(dbFile,bk); // sandaran harian
  const tmp=dbFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db));fs.renameSync(tmp,dbFile);
}
function authed(req){
  const pw=cfg.server.accessPassword;if(!pw)return true;
  const p=Buffer.from((req.headers.authorization||'').split(' ')[1]||'','base64').toString().split(':').slice(1).join(':');
  const h=s=>crypto.createHash('sha256').update(s).digest();return crypto.timingSafeEqual(h(p),h(pw));
}
const body=(req,max)=>new Promise((ok,no)=>{const c=[];let n=0;req.on('data',d=>{n+=d.length;if(n>max){no(new Error('Fail terlalu besar'));req.destroy()}else c.push(d)});req.on('end',()=>ok(Buffer.concat(c)));req.on('error',no)});
const send=(res,code,o)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
function serve(res,base,rel){
  const root=path.resolve(base),f=path.resolve(root,rel);
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Tiada')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff'});fs.createReadStream(f).pipe(res);
}
readCfg();init();
const handler=async(req,res)=>{try{
  if(!authed(req)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Sistem Sewa Bilik"'});return res.end('Kata laluan diperlukan')}
  const u=new URL(req.url,'http://x'),p=decodeURIComponent(u.pathname),m=req.method;
  if(p=='/api/state'&&m=='GET')return send(res,200,{rev:db.rev,data:db.data,seedDemo:cfg.database.seedDemoData!==false});
  if(p=='/api/state'&&m=='PUT'){
    const j=JSON.parse((await body(req,20e6)).toString());
    if(j.rev!==db.rev)return send(res,409,{error:'Data telah dikemas kini oleh pengguna lain',rev:db.rev});
    db={rev:db.rev+1,data:j.data};saveDb();return send(res,200,{rev:db.rev});
  }
  if(p=='/api/upload'&&m=='POST'){
    const folder=u.searchParams.get('folder')||'lain',name=decodeURIComponent(req.headers['x-filename']||'fail'),ext=path.extname(name).toLowerCase();
    if(!/^[a-z]+$/.test(folder))return send(res,400,{error:'Folder tidak sah'});
    if(!cfg.attachments.allowed.includes(ext))return send(res,400,{error:'Jenis fail tidak dibenarkan ('+cfg.attachments.allowed.join(', ')+')'});
    const buf=await body(req,cfg.attachments.maxFileSizeMB*1048576);
    const okType=ext=='.pdf'?buf.slice(0,4).toString()=='%PDF':(ext=='.jpg'||ext=='.jpeg')?(buf[0]==0xFF&&buf[1]==0xD8):true;
    if(!okType)return send(res,400,{error:'Kandungan fail tidak sepadan dengan jenisnya'});
    const ym=new Date().toISOString().slice(0,7),dir=path.join(attDir,folder,ym);fs.mkdirSync(dir,{recursive:true});
    const safe=crypto.randomBytes(4).toString('hex')+'-'+path.basename(name,ext).replace(/[^\w.-]+/g,'_').slice(0,60)+ext;
    fs.writeFileSync(path.join(dir,safe),buf);return send(res,200,{n:name,u:`/files/${folder}/${ym}/${safe}`});
  }
  if(p=='/api/config'&&m=='GET')return send(res,200,{dbPath:cfg.database.path,attachPath:cfg.attachments.path,dbResolved:dbFile,attachResolved:attDir,rev:db.rev,dbSize:fs.statSync(dbFile).size,port:cfg.server.port,secured:!!cfg.server.accessPassword});
  if(p=='/api/config'&&m=='POST'){
    const j=JSON.parse((await body(req,1e5)).toString()),old=cfg;cfg=JSON.parse(JSON.stringify(cfg));
    if(j.dbPath)cfg.database.path=String(j.dbPath);if(j.attachPath)cfg.attachments.path=String(j.attachPath);
    try{init()}catch(e){cfg=old;init();return send(res,400,{error:'Laluan tidak sah: '+e.message})}
    fs.writeFileSync(CFG,JSON.stringify(cfg,null,2));return send(res,200,{ok:true});
  }
  if(p.startsWith('/files/'))return serve(res,attDir,p.slice(7));
  return serve(res,path.join(ROOT,'public'),p=='/'?'index.html':p.slice(1));
}catch(e){send(res,500,{error:e.message})}};
function start(){return new Promise((ok,no)=>{
  let port=cfg.server.port,tries=0;const s=http.createServer(handler);
  s.on('error',e=>{if(e.code=='EADDRINUSE'&&tries++<10){port++;s.listen(port,cfg.server.host)}else no(e)});
  s.on('listening',()=>{log(port);ok({server:s,port})});s.listen(port,cfg.server.host);
})}
function log(port){
  console.log('Sistem Sewa Bilik berjalan.\n  Pangkalan data: '+dbFile+'\n  Lampiran      : '+attDir);
  Object.values(os.networkInterfaces()).flat().filter(i=>i.family=='IPv4'&&!i.internal).forEach(i=>console.log('  Buka di iPhone/Mac: http://'+i.address+':'+port));
  console.log('  Buka di komputer ini: http://localhost:'+port);
  if(cfg.server.accessPassword=='tukar-kata-laluan-ini')console.log('\n  AMARAN: tukar server.accessPassword dalam config/config.json!');
}
module.exports={handler,start,getCfg:()=>cfg};
if(require.main===module)start();

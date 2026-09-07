import fs from 'node:fs';
fs.mkdirSync('public/assets',{recursive:true});
fs.copyFileSync('web/assets/style.css','public/assets/style.css');
fs.copyFileSync('web/assets/logo-ab-premiere.png','public/assets/logo-ab-premiere.png');
for (const [source,target,module] of [['index','index','portal'],['admin','admin','admin']]) {
 let html=fs.readFileSync(`web/${source}.php`,'utf8').replace(/^<\?php.*?\?>/,'');
 let js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 js=js.replace(/async function api\([\s\S]*?return j}/,'');
 js=`import { api, notice } from './supabase.js';\n`+js;
 if(module==='portal') {
  html=html.replace('href="/admin"','href="admin.html"').replace('<section class="card portal">','<div id="connection" class="message" role="status">Conectando…</div><section class="card portal hidden" id="portalContent">');
  html=html.replace('<div><label>Código de autorización</label><input id="release" type="password" required></div>','<div class="muted">El registro será autorizado con la sesión del encargado.</div>');
  js=js.replace("release_code:$('release').value,",'');
  js=js.replace("if(id==='register')startCamera()",'');
  js=js.replace("msg('registerMessage',`🎉 Socio creado. Código: <b style=\"font-size:25px\">${d.code}</b>`)","msg('registerMessage',`🎉 Socio creado. Código: <b style=\"font-size:25px\">${esc(d.code)}</b>${d.photoWarning ? '<br>'+esc(d.photoWarning) : ''}`)");
  js=js.replace('c.width=v.videoWidth;c.height=v.videoHeight;','if(!v.videoWidth)return;const scale=Math.min(1,800/v.videoWidth);c.width=Math.round(v.videoWidth*scale);c.height=Math.round(v.videoHeight*scale);');
  js=js.replace("loadCatalogs();",`async function init(){try{await api('admin_session');await loadCatalogs();$('portalContent').classList.remove('hidden');$('connection').innerHTML='Sesión de atención activa. <a href="admin.html">Abrir administración</a>';}catch(e){$('connection').textContent=e.message;const a=document.createElement('a');a.href='admin.html?return=portal';a.className='btn';a.textContent='Iniciar sesión';$('connection').append(document.createElement('br'),a);}} init();`);
  js+=`\nwindow.addEventListener('pagehide',()=>stream?.getTracks().forEach(t=>t.stop()));\n`;
 } else {
  html=html.replace('href="/"','href="index.html"').replace('<label>Usuario</label><input id="user" value="admin">','<label for="user">Correo electrónico</label><input id="user" type="email" autocomplete="username" required>')
   .replace('<input id="pass" type="password">','<input id="pass" type="password" autocomplete="current-password" required>')
   .replace('<p class="muted">Inicial: admin / ABPremier2026</p>','<p class="muted">Utiliza tu cuenta de Supabase autorizada para AB Premier.</p>')
   .replace('href="export.php"','href="#"').replace('Descargar reporte completo en Excel','Descargar reporte en Excel')
   .replace('Crear usuario administrativo','Autorizar usuario administrativo')
   .replace('<label>Usuario</label><input id="adminUser"><label>Contraseña (mínimo 8 caracteres)</label><input id="adminPassword" type="password">','<p class="muted">Primero crea su cuenta en Supabase → Authentication → Users. Después autoriza aquí su correo.</p><label>Correo electrónico</label><input id="adminUser" type="email"><label>Permisos</label><select id="adminRole"><option value="recepcion">Recepción</option><option value="consulta">Solo consulta</option><option value="admin">Administrador</option></select>')
   .replace('>Crear usuario</button>','>Autorizar usuario</button>');
  js=js.replace('password:$(\'adminPassword\').value',"role:$('adminRole').value").replace("$('adminName').value=$('adminUser').value=$('adminPassword').value=''","$('adminName').value=$('adminUser').value=''");
  js=js.replace("excelLink.href='export.php?'+q.slice(1);",'');
  js=js.replace("esc(x.details||'—')","esc(typeof x.details==='object'?JSON.stringify(x.details):x.details||'—')");
  js=js.replace("boot()}catch", "await boot()}catch");
  js=js.replace("$('login').classList.add('hidden');",`if(new URLSearchParams(location.search).get('return')==='portal'){location.replace('index.html');return;}$('login').classList.add('hidden');`);
  js=js.replace('boot();',"boot().catch(e=>{showLogin();msg('loginMsg',esc(e.message),true)});");
  js+=`\n$('excelLink').addEventListener('click',async e=>{e.preventDefault();try{await api('export',null,\`&from=\${$('from').value}&to=\${$('to').value}&barber_id=\${$('filterBarber').value}&service_id=\${$('filterService').value}\`)}catch(e){notice(e.message)}});\n`;
 }
 // Existing inline events remain compatible with ES modules, without dynamic evaluation.
 const functions=[...js.matchAll(/(?:async )?function (\w+)\(/g)].map(m=>m[1]);
 js+=`\nObject.assign(window,{${[...new Set([...functions,'$'])].join(',')}});\nwindow.addEventListener('unhandledrejection',e=>{e.preventDefault();notice(e.reason?.message||'No se pudo completar la operación.');});\n`;
 html=html.replace(/<script>[\s\S]*?<\/script>/,`<script type="module" src="/src/${module}.js"></script>`);
 fs.writeFileSync(`${target}.html`,html);fs.writeFileSync(`src/${module}.js`,js);
}

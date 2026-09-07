// Uses the existing Git credential helper; never prints or persists credentials.
import {spawnSync} from 'node:child_process';
const cred=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8'});
const token=cred.stdout?.split('\n').find(l=>l.startsWith('password='))?.slice(9);
if(!token)throw Error('No GitHub credential available');
const base='https://api.github.com/repos/danielramse2006-glitch/AB-Premier';
const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
async function request(path,method='GET',body){const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(`${method} ${path}: ${r.status} ${j.message}`);return j;}
const mode=process.argv[2]||'status';
if(mode==='configure'){await request('/pages','PUT',{build_type:'workflow'});console.log('Pages configured for GitHub Actions');}
else if(mode==='run'){await request('/actions/workflows/pages.yml/dispatches','POST',{ref:'main'});console.log('Deployment requested');}
else {const p=await request('/pages');const runs=await request('/actions/workflows/pages.yml/runs?per_page=1').catch(()=>({workflow_runs:[]}));console.log(JSON.stringify({url:p.html_url,build_type:p.build_type,runs:runs.workflow_runs?.map(r=>({id:r.id,status:r.status,conclusion:r.conclusion,url:r.html_url,sha:r.head_sha}))}));}

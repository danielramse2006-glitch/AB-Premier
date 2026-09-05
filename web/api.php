<?php
declare(strict_types=1);
require_once __DIR__.'/lib.php';
start_session_safe();
$action=$_GET['action']??'';$d=db();

try {
switch($action){
case 'catalogs':
    json_response(['ok'=>true,'barbers'=>$d->query('SELECT id,name FROM barbers WHERE active=1 ORDER BY name')->fetchAll(),'services'=>$d->query('SELECT id,name,price,points FROM services WHERE active=1 ORDER BY name')->fetchAll()]);
case 'lookup':
    $code=trim((string)(body()['code']??''));if(!preg_match('/^\d{4}$/',$code))json_response(['ok'=>false,'message'=>'El código debe tener 4 números.'],422);
    $s=$d->prepare('SELECT * FROM clients WHERE code=?');$s->execute([$code]);$c=$s->fetch();if(!$c)json_response(['ok'=>false,'message'=>'Código no encontrado.'],404);
    $stats=client_stats((int)$c['id']);
    $weekday=array_fill(0,7,0);$q=$d->prepare('SELECT visited_at FROM visits WHERE client_id=?');$q->execute([$c['id']]);foreach($q as $v)$weekday[(int)date('w',strtotime($v['visited_at']))]++;
    $weekdayPct=[];foreach($weekday as $i=>$count)$weekdayPct[$i]=$stats['visits']?round($count*100/$stats['visits'],1):0;
    json_response(['ok'=>true,'client'=>array_merge($c,$stats,['photo_url'=>$c['photo']?'uploads/clients/'.$c['photo']:'','birthday_month'=>$c['birth_date']&&substr($c['birth_date'],5,2)===date('m'),'weekday_counts'=>$weekday,'weekday_percentages'=>$weekdayPct])]);
case 'register':
    $p=body();$name=trim((string)($p['full_name']??''));if(mb_strlen($name)<3)json_response(['ok'=>false,'message'=>'Escribe el nombre completo.'],422);
    if(!hash_equals(env_value('AB_RELEASE_CODE','ABREYNOSA'),(string)($p['release_code']??'')))json_response(['ok'=>false,'message'=>'Código de autorización incorrecto.'],403);
    do{$code=str_pad((string)random_int(0,9999),4,'0',STR_PAD_LEFT);$q=$d->prepare('SELECT 1 FROM clients WHERE code=?');$q->execute([$code]);}while($q->fetchColumn());
    $photo='';if(!empty($p['photo'])&&preg_match('#^data:image/(jpeg|png);base64,(.+)$#',(string)$p['photo'],$m)){$raw=base64_decode($m[2],true);if($raw!==false&&strlen($raw)<=4*1024*1024){$dir=__DIR__.'/uploads/clients';if(!is_dir($dir))mkdir($dir,0775,true);$photo=$code.'-'.bin2hex(random_bytes(4)).'.jpg';file_put_contents($dir.'/'.$photo,$raw);}}
    $s=$d->prepare('INSERT INTO clients(code,full_name,birth_date,phone,photo) VALUES(?,?,?,?,?)');$s->execute([$code,$name,$p['birth_date']?:null,trim((string)($p['phone']??'')),$photo]);
    audit('create','client',(int)$d->lastInsertId(),json_encode(['code'=>$code,'name'=>$name],JSON_UNESCAPED_UNICODE));
    json_response(['ok'=>true,'code'=>$code,'name'=>$name]);
case 'visit':
    $p=body();$code=trim((string)($p['code']??''));$barber=(int)($p['barber_id']??0);$service=(int)($p['service_id']??0);
    $s=$d->prepare('SELECT * FROM clients WHERE code=?');$s->execute([$code]);$c=$s->fetch();if(!$c)json_response(['ok'=>false,'message'=>'Cliente no encontrado.'],404);
    $s=$d->prepare('SELECT * FROM barbers WHERE id=? AND active=1');$s->execute([$barber]);if(!$s->fetch())json_response(['ok'=>false,'message'=>'Selecciona un barbero válido.'],422);
    $s=$d->prepare('SELECT * FROM services WHERE id=? AND active=1');$s->execute([$service]);$svc=$s->fetch();if(!$svc)json_response(['ok'=>false,'message'=>'Selecciona un corte válido.'],422);
    $s=$d->prepare("SELECT 1 FROM visits WHERE client_id=? AND visited_at>=?");$s->execute([$c['id'],date('Y-m-d 00:00:00')]);if($s->fetch())json_response(['ok'=>false,'message'=>'Este cliente ya tiene una visita registrada hoy.'],409);
    $stats=client_stats((int)$c['id']);$number=$stats['visits']+1;$won=$number%5===0;$points=(int)$svc['points'];
    $d->beginTransaction();$s=$d->prepare('INSERT INTO visits(client_id,barber_id,service_id,points_earned,visit_number,courtesy_won) VALUES(?,?,?,?,?,?)');$s->execute([$c['id'],$barber,$service,$points,$number,$won?1:0]);$visitId=(int)$d->lastInsertId();$d->prepare('UPDATE clients SET points=points+?,active=1,deactivated_at=NULL WHERE id=?')->execute([$points,$c['id']]);if($won)$d->prepare('INSERT INTO courtesies(client_id,visit_number,status) VALUES(?,?,?)')->execute([$c['id'],$number,'pending']);$d->commit();audit('create','visit',$visitId,json_encode(['client'=>$code,'visit_number'=>$number,'points'=>$points,'courtesy'=>$won],JSON_UNESCAPED_UNICODE));
    json_response(['ok'=>true,'visit_number'=>$number,'points_earned'=>$points,'total_points'=>(int)$c['points']+$points,'courtesy_won'=>$won,'next_courtesy'=>(int)(ceil(($number+1)/5)*5),'message'=>$won?'¡Felicidades! Has ganado una cortesía.':'Visita registrada correctamente.']);
case 'admin_login':
    $p=body();$s=$d->prepare('SELECT * FROM admins WHERE username=? AND active=1');$s->execute([trim((string)($p['username']??''))]);$u=$s->fetch();if(!$u||!password_verify((string)($p['password']??''),$u['password_hash']))json_response(['ok'=>false,'message'=>'Usuario o contraseña incorrectos.'],401);
    $_SESSION['admin']=['id'=>(int)$u['id'],'username'=>$u['username'],'role'=>$u['role']];$d->prepare('UPDATE admins SET last_login=CURRENT_TIMESTAMP WHERE id=?')->execute([$u['id']]);json_response(['ok'=>true,'user'=>$_SESSION['admin']]);
case 'admin_session':json_response(['ok'=>true,'authenticated'=>!empty($_SESSION['admin']),'user'=>$_SESSION['admin']??null]);
case 'admin_logout':session_destroy();json_response(['ok'=>true]);
case 'dashboard':
    require_admin();deactivate_absent();$rows=$d->query("SELECT c.*,(SELECT COUNT(*) FROM visits v WHERE v.client_id=c.id) visits,(SELECT MAX(visited_at) FROM visits v WHERE v.client_id=c.id) last_visit FROM clients c ORDER BY c.full_name")->fetchAll();
    $today=$monthVisits=0;$daily=[];for($i=30;$i>=0;$i--)$daily[date('Y-m-d',strtotime("-$i days"))]=0;
    $weekday=array_fill(0,7,0);$s=$d->prepare('SELECT visited_at FROM visits WHERE visited_at>=?');$s->execute([date('Y-m-d',strtotime('-30 days'))]);foreach($s as $v){$day=substr($v['visited_at'],0,10);$daily[$day]=($daily[$day]??0)+1;$weekday[(int)date('w',strtotime($v['visited_at']))]++;if($day===date('Y-m-d'))$today++;if(substr($day,0,7)===date('Y-m'))$monthVisits++;}
    $new=[];$absent=[];$monthly=[];$frequent=[];$upcoming=[];$birthdays=[];foreach($rows as &$c){$last=$c['last_visit']?:$c['created_at'];$c['days_absent']=(int)((time()-strtotime($last))/86400);if(substr($c['created_at'],0,7)===date('Y-m'))$new[]=$c;if($c['days_absent']>=30)$absent[]=$c;$s=$d->prepare('SELECT COUNT(*) FROM visits WHERE client_id=? AND visited_at>=?');$s->execute([$c['id'],date('Y-m-01')]);$c['month_visits']=(int)$s->fetchColumn();if($c['month_visits']>=1)$monthly[]=$c;if($c['month_visits']>=2&&$c['month_visits']<=3)$frequent[]=$c;if(((int)$c['visits']+1)%5===0)$upcoming[]=$c;if($c['birth_date']&&substr($c['birth_date'],5,2)===date('m'))$birthdays[]=$c;}
    $s=$d->prepare("SELECT c.*,COUNT(v.id) visits,MAX(v.visited_at) last_visit FROM clients c JOIN visits v ON v.client_id=c.id WHERE v.visited_at>=? GROUP BY c.id ORDER BY MAX(v.visited_at) DESC");$s->execute([date('Y-m-d 00:00:00')]);$todayClients=$s->fetchAll();
    $weekdayPct=[];$total31=array_sum($weekday);foreach($weekday as $i=>$count)$weekdayPct[$i]=$total31?round($count*100/$total31,1):0;
    json_response(['ok'=>true,'metrics'=>['active'=>count(array_filter($rows,fn($x)=>(int)$x['active']===1)),'today'=>$today,'month_visits'=>$monthVisits,'new'=>count($new),'absent'=>count($absent),'monthly'=>count($monthly),'frequent'=>count($frequent),'upcoming'=>count($upcoming),'birthdays'=>count($birthdays)],'clients'=>$rows,'lists'=>array_merge(compact('new','absent','monthly','frequent','upcoming','birthdays'),['today'=>$todayClients]),'daily'=>$daily,'weekday_counts'=>$weekday,'weekday_percentages'=>$weekdayPct]);
case 'visits':
    require_admin();$where=[];$args=[];foreach(['from'=>'>=','to'=>'<='] as $key=>$op){if(!empty($_GET[$key])){$where[]='v.visited_at '.$op.' ?';$args[]=$_GET[$key].($key==='to'?' 23:59:59':' 00:00:00');}}if(!empty($_GET['barber_id'])){$where[]='v.barber_id=?';$args[]=(int)$_GET['barber_id'];}if(!empty($_GET['service_id'])){$where[]='v.service_id=?';$args[]=(int)$_GET['service_id'];}
    $sql='SELECT v.*,c.code,c.full_name,b.name barber,s.name service FROM visits v JOIN clients c ON c.id=v.client_id JOIN barbers b ON b.id=v.barber_id JOIN services s ON s.id=v.service_id'.($where?' WHERE '.implode(' AND ',$where):'').' ORDER BY v.visited_at DESC LIMIT 1000';$s=$d->prepare($sql);$s->execute($args);json_response(['ok'=>true,'visits'=>$s->fetchAll()]);
case 'save_client':
    require_admin();$p=body();$id=(int)$p['id'];$old=$d->prepare('SELECT full_name,birth_date,phone,active FROM clients WHERE id=?');$old->execute([$id]);$before=$old->fetch();$s=$d->prepare('UPDATE clients SET full_name=?,birth_date=?,phone=?,active=? WHERE id=?');$s->execute([trim($p['full_name']),$p['birth_date']?:null,trim($p['phone']??''),!empty($p['active'])?1:0,$id]);audit('update','client',$id,json_encode(['before'=>$before,'after'=>['full_name'=>trim($p['full_name']),'birth_date'=>$p['birth_date']?:null,'phone'=>trim($p['phone']??''),'active'=>!empty($p['active'])?1:0]],JSON_UNESCAPED_UNICODE));json_response(['ok'=>true]);
case 'save_catalog':
    require_admin();$p=body();$table=($p['type']??'')==='barber'?'barbers':'services';$id=(int)($p['id']??0);$name=trim((string)($p['name']??''));if(mb_strlen($name)<2)json_response(['ok'=>false,'message'=>'Escribe un nombre válido.'],422);$active=!array_key_exists('active',$p)||!empty($p['active'])?1:0;
    if($id){$old=$d->prepare("SELECT * FROM $table WHERE id=?");$old->execute([$id]);$before=$old->fetch();if(!$before)json_response(['ok'=>false,'message'=>'Registro no encontrado.'],404);if($table==='barbers'){$s=$d->prepare('UPDATE barbers SET name=?,active=? WHERE id=?');$s->execute([$name,$active,$id]);$after=['name'=>$name,'active'=>$active];}else{$after=['name'=>$name,'description'=>trim((string)($p['description']??'')),'price'=>(float)($p['price']??0),'points'=>(int)($p['points']??50),'active'=>$active];$s=$d->prepare('UPDATE services SET name=?,description=?,price=?,points=?,active=? WHERE id=?');$s->execute([$after['name'],$after['description'],$after['price'],$after['points'],$after['active'],$id]);}audit('update',$table,$id,json_encode(['before'=>$before,'after'=>$after],JSON_UNESCAPED_UNICODE));}
    else{if($table==='barbers'){$s=$d->prepare('INSERT INTO barbers(name,active) VALUES(?,1)');$s->execute([$name]);}else{$s=$d->prepare('INSERT INTO services(name,description,price,points,active) VALUES(?,?,?,?,1)');$s->execute([$name,trim((string)($p['description']??'')),(float)($p['price']??0),(int)($p['points']??50)]);}$id=(int)$d->lastInsertId();audit('create',$table,$id,json_encode(['name'=>$name],JSON_UNESCAPED_UNICODE));}json_response(['ok'=>true,'id'=>$id]);
case 'admin_catalogs':
    require_admin();json_response(['ok'=>true,'barbers'=>$d->query('SELECT id,name,active,created_at FROM barbers ORDER BY active DESC,name')->fetchAll(),'services'=>$d->query('SELECT id,name,description,price,points,active,created_at FROM services ORDER BY active DESC,name')->fetchAll()]);
case 'redeem':
    require_admin();$id=(int)(body()['id']??0);$d->prepare("UPDATE courtesies SET status='redeemed',redeemed_at=CURRENT_TIMESTAMP WHERE id=?")->execute([$id]);audit('redeem','courtesy',$id);json_response(['ok'=>true]);
case 'courtesies':
    require_admin();$rows=$d->query("SELECT x.*,c.code,c.full_name FROM courtesies x JOIN clients c ON c.id=x.client_id ORDER BY x.earned_at DESC")->fetchAll();json_response(['ok'=>true,'courtesies'=>$rows]);
case 'admins':
    require_admin();$rows=$d->query('SELECT id,username,full_name,role,active,created_at,last_login FROM admins ORDER BY username')->fetchAll();json_response(['ok'=>true,'admins'=>$rows]);
case 'save_admin':
    require_admin();$p=body();$username=trim((string)($p['username']??''));$name=trim((string)($p['full_name']??''));$password=(string)($p['password']??'');if(!preg_match('/^[A-Za-z0-9._-]{3,30}$/',$username)||strlen($password)<8)json_response(['ok'=>false,'message'=>'Usuario inválido o contraseña menor a 8 caracteres.'],422);$s=$d->prepare('INSERT INTO admins(username,password_hash,full_name,role,active) VALUES(?,?,?,?,1)');$s->execute([$username,password_hash($password,PASSWORD_DEFAULT),$name,'admin']);audit('create','admin',(int)$d->lastInsertId());json_response(['ok'=>true]);
case 'audit_log':
    require_admin();$rows=$d->query("SELECT l.id,l.action,l.entity,l.entity_id,l.details,l.created_at,COALESCE(a.full_name,a.username,'Sistema / cliente') admin_name FROM audit_log l LEFT JOIN admins a ON a.id=l.admin_id ORDER BY l.id DESC LIMIT 500")->fetchAll();json_response(['ok'=>true,'entries'=>$rows]);
default:json_response(['ok'=>false,'message'=>'Acción no encontrada.'],404);
}}
catch(Throwable $e){if($d->inTransaction())$d->rollBack();error_log($e->__toString());json_response(['ok'=>false,'message'=>'Ocurrió un error interno.'],500);}

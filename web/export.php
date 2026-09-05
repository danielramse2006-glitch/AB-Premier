<?php
declare(strict_types=1);
require_once __DIR__.'/lib.php';
start_session_safe();
require_admin();
$where=[];$args=[];$filterText=[];
foreach(['from'=>'>=','to'=>'<='] as $key=>$op){if(!empty($_GET[$key])){$where[]='v.visited_at '.$op.' ?';$args[]=$_GET[$key].($key==='to'?' 23:59:59':' 00:00:00');$filterText[]=($key==='from'?'Desde ':'Hasta ').$_GET[$key];}}
if(!empty($_GET['barber_id'])){$where[]='v.barber_id=?';$args[]=(int)$_GET['barber_id'];$s=db()->prepare('SELECT name FROM barbers WHERE id=?');$s->execute([(int)$_GET['barber_id']]);$filterText[]='Barbero: '.($s->fetchColumn()?:'Todos');}
if(!empty($_GET['service_id'])){$where[]='v.service_id=?';$args[]=(int)$_GET['service_id'];$s=db()->prepare('SELECT name FROM services WHERE id=?');$s->execute([(int)$_GET['service_id']]);$filterText[]='Servicio: '.($s->fetchColumn()?:'Todos');}
$sql='SELECT v.visited_at,c.full_name,c.code,b.name barber,s.name service,v.points_earned,v.visit_number,v.courtesy_won FROM visits v JOIN clients c ON c.id=v.client_id JOIN barbers b ON b.id=v.barber_id JOIN services s ON s.id=v.service_id'.($where?' WHERE '.implode(' AND ',$where):'').' ORDER BY v.visited_at DESC';
$q=db()->prepare($sql);$q->execute($args);$rows=$q->fetchAll();
$clients=db()->query("SELECT c.code,c.full_name,c.birth_date,c.phone,c.points,c.active,c.created_at,(SELECT COUNT(*) FROM visits v WHERE v.client_id=c.id) visits,(SELECT MAX(visited_at) FROM visits v WHERE v.client_id=c.id) last_visit FROM clients c ORDER BY c.full_name")->fetchAll();
$barbers=db()->query('SELECT name,active,created_at FROM barbers ORDER BY active DESC,name')->fetchAll();
$services=db()->query('SELECT name,description,price,points,active,created_at FROM services ORDER BY active DESC,name')->fetchAll();
$courtesies=db()->query("SELECT c.code,c.full_name,x.visit_number,x.status,x.earned_at,x.redeemed_at FROM courtesies x JOIN clients c ON c.id=x.client_id ORDER BY x.earned_at DESC")->fetchAll();
$auditRows=db()->query("SELECT l.created_at,COALESCE(a.full_name,a.username,'Sistema / cliente') admin_name,l.action,l.entity,l.entity_id,l.details FROM audit_log l LEFT JOIN admins a ON a.id=l.admin_id ORDER BY l.id DESC LIMIT 1000")->fetchAll();
$xml=fn(mixed $v):string=>htmlspecialchars((string)$v,ENT_XML1|ENT_QUOTES,'UTF-8');
$cell=fn(mixed $v,string $style='Cell',string $type='String'):string=>'<Cell ss:StyleID="'.$style.'"><Data ss:Type="'.$type.'">'.$xml($v).'</Data></Cell>';
$totalPoints=array_sum(array_map(fn($r)=>(int)$r['points_earned'],$rows));$totalCourtesies=count(array_filter($rows,fn($r)=>(int)$r['courtesy_won']===1));
header('Content-Type: application/vnd.ms-excel; charset=UTF-8');
header('Content-Disposition: attachment; filename="Reporte-AB-Premiere-'.date('Y-m-d').'.xls"');
audit('export','complete_report',null,json_encode(['filters'=>$filterText,'visits'=>count($rows),'clients'=>count($clients)],JSON_UNESCAPED_UNICODE));
echo '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>';
?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>
 <Style ss:ID="Title"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Georgia" ss:Size="20" ss:Bold="1" ss:Color="#D9B65D"/><Interior ss:Color="#10271D" ss:Pattern="Solid"/></Style>
 <Style ss:ID="Subtitle"><Alignment ss:Horizontal="Center"/><Font ss:Italic="1" ss:Color="#53635B"/><Interior ss:Color="#F7F2E5" ss:Pattern="Solid"/></Style>
 <Style ss:ID="Header"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#176044" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBA64F"/></Borders></Style>
 <Style ss:ID="Cell"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E1D0"/></Borders></Style>
 <Style ss:ID="Alt"><Interior ss:Color="#F9F6EC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E1D0"/></Borders></Style>
 <Style ss:ID="Courtesy"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#8A641E"/><Interior ss:Color="#FFF0B8" ss:Pattern="Solid"/></Style>
 <Style ss:ID="Summary"><Font ss:Bold="1" ss:Color="#10271D"/><Interior ss:Color="#E8D59A" ss:Pattern="Solid"/></Style>
</Styles><Worksheet ss:Name="Visitas"><Table>
 <Column ss:Width="130"/><Column ss:Width="190"/><Column ss:Width="65"/><Column ss:Width="135"/><Column ss:Width="170"/><Column ss:Width="70"/><Column ss:Width="90"/><Column ss:Width="80"/>
 <Row ss:Height="36"><Cell ss:MergeAcross="7" ss:StyleID="Title"><Data ss:Type="String">AB PREMIERE · REPORTE DE VISITAS</Data></Cell></Row>
 <Row ss:Height="24"><Cell ss:MergeAcross="7" ss:StyleID="Subtitle"><Data ss:Type="String"><?=$xml($filterText?implode(' · ',$filterText):'Todos los registros')?> · Generado <?=$xml(date('d/m/Y H:i'))?></Data></Cell></Row><Row ss:Height="8"/>
 <Row ss:Height="26"><?php foreach(['Fecha','Cliente','Código','Barbero','Corte o servicio','Puntos','Visita número','Cortesía'] as $h)echo $cell($h,'Header');?></Row>
 <?php foreach($rows as $i=>$r):$style=$i%2?'Alt':'Cell';?><Row><?php echo $cell($r['visited_at'],$style).$cell($r['full_name'],$style).$cell($r['code'],$style).$cell($r['barber'],$style).$cell($r['service'],$style).$cell((int)$r['points_earned'],$style,'Number').$cell((int)$r['visit_number'],$style,'Number').$cell((int)$r['courtesy_won']?'SÍ':'No',(int)$r['courtesy_won']?'Courtesy':$style);?></Row><?php endforeach;?>
 <Row ss:Height="8"/><Row><?php echo $cell('RESUMEN','Summary').$cell('Visitas: '.count($rows),'Summary').$cell('','Summary').$cell('Puntos: '.$totalPoints,'Summary').$cell('','Summary').$cell('Cortesías: '.$totalCourtesies,'Summary').$cell('','Summary').$cell('','Summary');?></Row>
</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>4</SplitHorizontal><TopRowBottomPane>4</TopRowBottomPane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions></Worksheet>

<Worksheet ss:Name="Clientes"><Table>
 <Column ss:Width="70"/><Column ss:Width="190"/><Column ss:Width="95"/><Column ss:Width="110"/><Column ss:Width="80"/><Column ss:Width="65"/><Column ss:Width="70"/><Column ss:Width="125"/><Column ss:Width="125"/>
 <Row ss:Height="34"><Cell ss:MergeAcross="8" ss:StyleID="Title"><Data ss:Type="String">CLIENTES AB PREMIERE</Data></Cell></Row><Row ss:Height="8"/>
 <Row><?php foreach(['Código','Nombre','Nacimiento','Teléfono','Puntos','Visitas','Estado','Registro','Última visita'] as $h)echo $cell($h,'Header');?></Row>
 <?php foreach($clients as $i=>$r):$st=$i%2?'Alt':'Cell';?><Row><?php echo $cell($r['code'],$st).$cell($r['full_name'],$st).$cell($r['birth_date']?:'—',$st).$cell($r['phone'],$st).$cell((int)$r['points'],$st,'Number').$cell((int)$r['visits'],$st,'Number').$cell((int)$r['active']?'Activo':'Inactivo',$st).$cell($r['created_at'],$st).$cell($r['last_visit']?:'Sin visitas',$st);?></Row><?php endforeach;?>
 <Row/><Row><?php echo $cell('TOTAL','Summary').$cell(count($clients).' clientes','Summary').$cell('','Summary').$cell('','Summary').$cell('','Summary').$cell('','Summary').$cell('','Summary').$cell('','Summary').$cell('','Summary');?></Row>
</Table></Worksheet>

<Worksheet ss:Name="Barberos"><Table><Column ss:Width="190"/><Column ss:Width="90"/><Column ss:Width="130"/><Row ss:Height="34"><Cell ss:MergeAcross="2" ss:StyleID="Title"><Data ss:Type="String">BARBEROS</Data></Cell></Row><Row/><Row><?php foreach(['Nombre','Estado','Fecha de alta'] as $h)echo $cell($h,'Header');?></Row><?php foreach($barbers as $i=>$r):$st=$i%2?'Alt':'Cell';?><Row><?php echo $cell($r['name'],$st).$cell((int)$r['active']?'Activo':'Inactivo',$st).$cell($r['created_at'],$st);?></Row><?php endforeach;?></Table></Worksheet>

<Worksheet ss:Name="Servicios"><Table><Column ss:Width="180"/><Column ss:Width="230"/><Column ss:Width="80"/><Column ss:Width="70"/><Column ss:Width="85"/><Column ss:Width="130"/><Row ss:Height="34"><Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">CORTES Y SERVICIOS</Data></Cell></Row><Row/><Row><?php foreach(['Nombre','Descripción','Precio','Puntos','Estado','Fecha de alta'] as $h)echo $cell($h,'Header');?></Row><?php foreach($services as $i=>$r):$st=$i%2?'Alt':'Cell';?><Row><?php echo $cell($r['name'],$st).$cell($r['description'],$st).$cell((float)$r['price'],$st,'Number').$cell((int)$r['points'],$st,'Number').$cell((int)$r['active']?'Activo':'Inactivo',$st).$cell($r['created_at'],$st);?></Row><?php endforeach;?></Table></Worksheet>

<Worksheet ss:Name="Cortesías"><Table><Column ss:Width="70"/><Column ss:Width="190"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="130"/><Column ss:Width="130"/><Row ss:Height="34"><Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">CORTESÍAS</Data></Cell></Row><Row/><Row><?php foreach(['Código','Cliente','Visita número','Estado','Obtenida','Entregada'] as $h)echo $cell($h,'Header');?></Row><?php foreach($courtesies as $i=>$r):$st=$i%2?'Alt':'Cell';?><Row><?php echo $cell($r['code'],$st).$cell($r['full_name'],$st).$cell((int)$r['visit_number'],$st,'Number').$cell($r['status']==='pending'?'Pendiente':'Entregada',$st).$cell($r['earned_at'],$st).$cell($r['redeemed_at']?:'—',$st);?></Row><?php endforeach;?></Table></Worksheet>

<Worksheet ss:Name="Bitácora"><Table><Column ss:Width="130"/><Column ss:Width="150"/><Column ss:Width="90"/><Column ss:Width="100"/><Column ss:Width="60"/><Column ss:Width="360"/><Row ss:Height="34"><Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">BITÁCORA DEL SISTEMA</Data></Cell></Row><Row/><Row><?php foreach(['Fecha','Usuario','Acción','Elemento','ID','Detalle'] as $h)echo $cell($h,'Header');?></Row><?php foreach($auditRows as $i=>$r):$st=$i%2?'Alt':'Cell';?><Row><?php echo $cell($r['created_at'],$st).$cell($r['admin_name'],$st).$cell($r['action'],$st).$cell($r['entity'],$st).$cell($r['entity_id']?:'—',$st).$cell($r['details']?:'—',$st);?></Row><?php endforeach;?></Table></Worksheet>
</Workbook>

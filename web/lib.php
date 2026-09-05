<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

function start_session_safe(): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params(['httponly'=>true, 'samesite'=>'Strict', 'secure'=>!empty($_SERVER['HTTPS'])]);
        session_start();
    }
}

function init_db(): void {
    $d = db(); $auto = is_mysql() ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $bool = is_mysql() ? 'TINYINT' : 'INTEGER';
    $d->exec("CREATE TABLE IF NOT EXISTS admins(id $auto, username VARCHAR(80) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, full_name VARCHAR(120) DEFAULT '', role VARCHAR(30) DEFAULT 'admin', active $bool DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME NULL)");
    $d->exec("CREATE TABLE IF NOT EXISTS clients(id $auto, code VARCHAR(4) UNIQUE NOT NULL, full_name VARCHAR(160) NOT NULL, birth_date DATE NULL, phone VARCHAR(30) DEFAULT '', photo VARCHAR(255) DEFAULT '', points INTEGER DEFAULT 0, active $bool DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deactivated_at DATETIME NULL)");
    $d->exec("CREATE TABLE IF NOT EXISTS barbers(id $auto, name VARCHAR(120) NOT NULL, active $bool DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    $d->exec("CREATE TABLE IF NOT EXISTS services(id $auto, name VARCHAR(120) NOT NULL, description TEXT DEFAULT '', price DECIMAL(10,2) DEFAULT 0, points INTEGER DEFAULT 50, active $bool DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    $d->exec("CREATE TABLE IF NOT EXISTS visits(id $auto, client_id INTEGER NOT NULL, barber_id INTEGER NOT NULL, service_id INTEGER NOT NULL, visited_at DATETIME DEFAULT CURRENT_TIMESTAMP, points_earned INTEGER DEFAULT 50, visit_number INTEGER NOT NULL, courtesy_won $bool DEFAULT 0, notes TEXT DEFAULT '', FOREIGN KEY(client_id) REFERENCES clients(id), FOREIGN KEY(barber_id) REFERENCES barbers(id), FOREIGN KEY(service_id) REFERENCES services(id))");
    $d->exec("CREATE TABLE IF NOT EXISTS courtesies(id $auto, client_id INTEGER NOT NULL, visit_number INTEGER NOT NULL, status VARCHAR(20) DEFAULT 'pending', earned_at DATETIME DEFAULT CURRENT_TIMESTAMP, redeemed_at DATETIME NULL, UNIQUE(client_id,visit_number), FOREIGN KEY(client_id) REFERENCES clients(id))");
    $d->exec("CREATE TABLE IF NOT EXISTS audit_log(id $auto, admin_id INTEGER NULL, action VARCHAR(60) NOT NULL, entity VARCHAR(60) NOT NULL, entity_id INTEGER NULL, details TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    if (!(int)$d->query('SELECT COUNT(*) FROM admins')->fetchColumn()) {
        $s=$d->prepare('INSERT INTO admins(username,password_hash,full_name,role) VALUES(?,?,?,?)');
        $s->execute(['admin',password_hash('ABPremier2026',PASSWORD_DEFAULT),'Administrador AB','admin']);
    }
    if (!(int)$d->query('SELECT COUNT(*) FROM barbers')->fetchColumn()) {
        $s=$d->prepare('INSERT INTO barbers(name) VALUES(?)'); foreach(['Barbero principal','Barbero 2'] as $x)$s->execute([$x]);
    }
    if (!(int)$d->query('SELECT COUNT(*) FROM services')->fetchColumn()) {
        $s=$d->prepare('INSERT INTO services(name,description,price,points) VALUES(?,?,?,?)');
        foreach([['Corte clásico','Corte de cabello',0,50],['Corte y barba','Servicio completo',0,75],['Barba','Perfilado de barba',0,40]] as $x)$s->execute($x);
    }
    if (!(int)$d->query('SELECT COUNT(*) FROM clients')->fetchColumn()) {
        $s=$d->prepare('INSERT INTO clients(code,full_name,birth_date,phone) VALUES(?,?,?,?)');
        $s->execute(['2026','Cliente Demostración','1990-09-15','899-000-0000']);
    }
}

function json_response(array $data, int $status=200): never { http_response_code($status); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data,JSON_UNESCAPED_UNICODE); exit; }
function body(): array { return json_decode(file_get_contents('php://input'),true) ?: $_POST; }
function require_admin(): array { start_session_safe(); if(empty($_SESSION['admin']))json_response(['ok'=>false,'message'=>'Sesión requerida'],401); return $_SESSION['admin']; }
function audit(string $action,string $entity,?int $id=null,string $details=''): void { start_session_safe(); $s=db()->prepare('INSERT INTO audit_log(admin_id,action,entity,entity_id,details) VALUES(?,?,?,?,?)');$s->execute([$_SESSION['admin']['id']??null,$action,$entity,$id,mb_substr($details,0,1000)]); }
function client_stats(int $id): array {
    $s=db()->prepare('SELECT COUNT(*) total,MAX(visited_at) last_visit FROM visits WHERE client_id=?');$s->execute([$id]);$x=$s->fetch();$total=(int)$x['total'];
    return ['visits'=>$total,'last_visit'=>$x['last_visit'],'next_courtesy'=>(int)(ceil(($total+1)/5)*5),'one_away'=>($total+1)%5===0];
}
function deactivate_absent(): int {
    $sql=is_mysql()?"UPDATE clients c LEFT JOIN (SELECT client_id,MAX(visited_at) last_visit FROM visits GROUP BY client_id) v ON v.client_id=c.id SET c.active=0,c.deactivated_at=NOW() WHERE c.active=1 AND DATEDIFF(CURDATE(),COALESCE(v.last_visit,c.created_at))>=45":"UPDATE clients SET active=0,deactivated_at=datetime('now','localtime') WHERE active=1 AND julianday('now','localtime')-julianday(COALESCE((SELECT MAX(visited_at) FROM visits WHERE client_id=clients.id),created_at))>=45";
    return db()->exec($sql);
}
init_db();

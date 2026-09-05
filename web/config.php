<?php
declare(strict_types=1);

const APP_NAME = 'AB Premiere';
const APP_TIMEZONE = 'America/Matamoros';
date_default_timezone_set(APP_TIMEZONE);

// Local: SQLite. En cPanel define estas variables como mysql y sus credenciales.
const LOCAL_DB_FILE = __DIR__ . '/storage/ab_premiere_web.sqlite';

function env_value(string $name, string $default = ''): string {
    $value = getenv($name);
    return $value === false ? $default : $value;
}

function is_mysql(): bool { return strtolower(env_value('AB_DB_DRIVER', 'sqlite')) === 'mysql'; }

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    if (is_mysql()) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            env_value('AB_DB_HOST', 'localhost'), env_value('AB_DB_PORT', '3306'), env_value('AB_DB_NAME'));
        $pdo = new PDO($dsn, env_value('AB_DB_USER'), env_value('AB_DB_PASSWORD'));
    } else {
        if (!is_dir(dirname(LOCAL_DB_FILE))) mkdir(dirname(LOCAL_DB_FILE), 0775, true);
        $pdo = new PDO('sqlite:' . LOCAL_DB_FILE);
        $pdo->exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=15000');
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

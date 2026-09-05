<?php
require_once __DIR__.'/lib.php';
$count=deactivate_absent();
echo date('c')." Cuentas desactivadas: $count\n";

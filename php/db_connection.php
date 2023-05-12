<?php
$dbhost = 'gis4cloud.com';
$dbuser = 'grupo5_ptas2023';
$dbpass = 'grupo5_ptas2023';
$dbname = 'grupo5_ptas2023';

$connection = null;

function connectToDB() {
    global $dbhost, $dbuser, $dbpass, $dbname, $connection;

    if( $connection === null ) {
        $connection = pg_connect("host=$dbhost dbname=$dbname user=$dbuser password=$dbpass");
    
        if(!$connection) {
            echo "Error: Unable establish connection to database!\n";
            return null;
        }
    }
    return $connection;
}

$connection = connectToDB();

?>
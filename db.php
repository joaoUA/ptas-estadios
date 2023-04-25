<?php
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
    $dbhost = 'localhost';
    $dbuser = 'postgres';
    $dbpass = '1234';
    $dbname = 'PTAS';
   
   $conn = pg_connect("host=$dbhost dbname=$dbname user=$dbuser password=$dbpass");

   if(!$conn){
      echo "Error : Unable to open database\n";
   }

   $resultEstadios = pg_query($conn, "
    select jsonb_build_object(
        'type', 'FeatureCollection', 
        'features', jsonb_agg(feature) )
    from (
        select jsonb_build_object(
            'type', 'Feature', 'id', id, 'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', to_jsonb(inputs)- 'id' - 'geom'
        ) AS feature
            from (select * from estadios) inputs) features;") or die('Query Failed');

    $resEstadios = pg_fetch_assoc($resultEstadios)["jsonb_build_object"];
    
    
    function json_encode_recursive($value) {
        if (is_array($value)) {
            $value = array_map('json_encode_recursive', $value);
        } elseif (is_object($value)) {
            $value = json_encode_recursive(get_object_vars($value));
        } elseif (is_string($value)) {
            $value = utf8_encode($value);
        }
        
        return $value !== null ? $value : 'null';
    }
    //$resEstadiosJson = json_encode_recursive($resEstadios);
    //return $resEstadiosJson;

    $resultPoIBares = pg_query($conn, "
    select jsonb_build_object(
        'type', 'FeatureCollection', 'features', jsonb_agg(feature) )
    from (
        select jsonb_build_object(
            'type', 'Feature',
            'id', id,
            'category', categoria,
            'geometry',ST_AsGeoJSON(geom)::jsonb,
            'properties', to_jsonb(inputs)- 'id' - 'geom'
        ) AS feature
            from (select * from poi_bares) inputs) features;") or die('Query Failed');
   
    $resPOIs =  pg_fetch_assoc($resultPoIBares)["jsonb_build_object"];

    //$resPOIJson = json_encode_recursive($resPOIs);

    $array = [$resEstadios, $resPOIs];

    //echo $resEstadiosJson;
    
    //print_r(json_encode_recursive($array));
    pg_close($conn);

    echo json_encode($array);
    //return json_encode_recursive($res);
?>
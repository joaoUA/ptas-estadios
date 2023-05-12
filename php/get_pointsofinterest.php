<?php
    require_once 'db_connection.php';

    $connection = connectToDB();
    if(!$connection) {
        die("Unable to connect to the database.");
    }

    function retrievePOIs($connection) {
        $query = "
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', jsonb_agg(feature)
        )
        FROM (
            SELECT jsonb_build_object(
                'type', 'Feature',
                'id', id,
                'category', categoria,
                'geometry', ST_AsGeoJSON(geom)::jsonb,
                'properties', to_jsonb(inputs) - 'id' - 'geom'
            ) AS feature
            FROM (SELECT * FROM poi_final) inputs
        ) features;";
    
        $result = pg_prepare($connection, "pois_query", $query);
        $result = pg_execute($connection, "pois_query", []);

        if (!$result) {
            die("Error executing query: " . pg_last_error($connection));
        }
        
        return pg_fetch_assoc($result)["jsonb_build_object"];
    }

    $resPOIs = retrievePOIs($connection);

    echo json_encode($resPOIs);
?>

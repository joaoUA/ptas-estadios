<?php
    require_once 'db_connection.php';

    $connection = connectToDB();
    if(!$connection) {
        die("Unable to connect to the database.");
    }    

    function retrieveStadiums($connection)
    {
        $query = "
            SELECT  jsonb_build_object(
                'type', 'FeatureCollection',
                'features', jsonb_agg(feature)
            )
            FROM (
                SELECT jsonb_build_object(
                    'type', 'Feature',
                    'id', id,
                    'geometry', ST_AsGeoJSON(geom)::jsonb,
                    'properties', to_jsonb(inputs) - 'id' - 'geom'
                ) AS feature
                FROM (SELECT * FROM estadios) inputs
            ) features;";
        
        $result = pg_prepare($connection, "estadios_query", $query);
        $result = pg_execute($connection, "estadios_query", []);

        if(!$result) {
            die("Error executing query: " . pg_last_error($connection));
        }

        return pg_fetch_assoc($result)["jsonb_build_object"];
    }

    $resultStadiumns = retrieveStadiums($connection);

    echo json_encode($resultStadiumns);
?>
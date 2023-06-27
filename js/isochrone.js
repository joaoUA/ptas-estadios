async function getRoutingPolygon(lon, lat, time) {
    const url =
        `https://routing.gis4cloud.pt/isochrone?json={
            "locations":[
                {
                    "lat":${lat},
                    "lon":${lon}
                }
            ],
            "costing":"pedestrian",
            "polygons":true,
            "contours":[
                {
                    "time":${time},
                    "color":"ff0000"
                }
            ]
        }
        &id=hull inicial`;
    return await fetchData(url);
}

async function getPolygonAroundStadium(center) {

    const projected = ol.proj.transform(
        center,
        'EPSG:3857',
        'EPSG:4326',
    );

    const longitude = projected[0];
    const latitude = projected[1];
    const time = parseInt(minutesSlider.value);

    let polygonsFeatures = await getRoutingPolygon(longitude, latitude, time);

    return geojsonFormat.readFeatures(polygonsFeatures, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
    })
}
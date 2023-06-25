async function getRoutingPolygon(lon, lat, time, color) {
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
                    "time":15.0,
                    "color":"ff0000"
                }
            ]
        }
        &id=hull inicial`;
    return await fetchData(url);
}
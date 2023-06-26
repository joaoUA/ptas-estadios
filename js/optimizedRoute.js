/**
 * Retrieves an optimized route between two sets of coordinates.
 * @param {Array} from Array representing the starting coordinates [long, lat].
 * @param {Array} to Array representing the ending coordinates [long, lat].
 * @returns {Promise<Array>} A promise that resolves to an array of the decoded latitude and longitude coordinates representing the optimized route.
 */
async function getOptimizedRoute(from, to) {
    const fromCoords = turf.toWgs84(turf.point(from)).geometry.coordinates;
    const toCoords = turf.toWgs84(turf.point(to)).geometry.coordinates;

    const base = `https://routing.gis4cloud.pt/route?json={"locations":[{"lat":${fromCoords[1]},"lon":${fromCoords[0]}\},{"lat":${toCoords[1]},"lon":${toCoords[0]}\}],"costing":"auto","costing_options":{"auto":{"country_crossing_penalty":2000.0}},"units":"kilometers%20","id":"my_work_route"}`;

    try {
        const data = await fetchData(base);

        const shape = data.trip.legs[0].shape;
        const decoded = decode(shape);
        return decoded;
    } catch (error) {
        alert('Não foi possível encontrar uma rota entre os dois pontos!');
        return null;
    }
};

/**
 * Decodes a string representation of encoded coordinates into
 * longitude and latitude values.
 * @param {string} str The encoded string representing coordinates.
 * @param {number} precision The number of decimal places to round the coordinates to.
 * @returns {Array} An array of latitude and longitude pairs.
 */
function decode(str, precision) {
    let index = 0;
    let latitude = 0;
    let longitude = 0;
    let shift = 0;
    let result = 0;
    let byte = null;
    const coordinates = [];
    const factor = Math.pow(10, precision || 6);

    //Coordinates have variable length when encoded
    //so just keep track of whether we've hit the end of the string.
    //In each loop iteration, a single coordinate is decoded.
    while (index < str.length) {
        //Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        // Decode latitude change
        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = 0;
        result = 0;

        // Decode longitude change
        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        latitude += latitude_change;
        longitude += longitude_change;

        coordinates.push([latitude / factor, longitude / factor]);
    }

    return coordinates;
}
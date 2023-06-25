const startingPointInput = document.getElementById('input-starting-address');
const calculateRouteBtn = document.getElementById('btn-calculate-route');
calculateRouteBtn.addEventListener('click', async () => {

    addrSource.clear();
    routeSource.clear();

    const address = startingPointInput.value.trim();
    if (!address || stadiumSelect.value === defaultSelectValue)
        return;

    const addressCoords = await getAddressCoordinates(address);

    const startingPointsFeatures = addressCoords.features.map(feat => new ol.Feature({
        geometry: new ol.geom.Poin(feat.geometry.coordinates).transform(turfProjection, mapContext.projection),
        label: feat.properties.label
    }));
    addrSource.addFeatures(startingPointsFeatures);

    const startingPointsContainer = document.getElementById('starting-points-container');
    startingPointsFeatures.forEach(feat => {
        const parent = document.createElement('div');
        parent.classList.add('starting-point');

        const title = document.createElement('h4');
        title.innerText = feat.values_.label;

        parent.appendChild(title);
        startingPointsContainer.appendChild(parent);

        parent.addEventListener('click', () => {
            calculateRoute(feat)
        })
    })
});



async function getAddressCoordinates(address) {
    const geocodingAPI = '5b3ce3597851110001cf6248effbb3f392b94119b82ddf1d0a903043';
    const baseURL = 'https://api.openrouteservice.org/geocode/search';

    const url = new URL(baseURL);
    url.searchParams.append('api_key', geocodingAPI);
    url.searchParams.append('text', address);

    try {
        return await fetchData(url);
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function calculateRoute(startingPoint) {
    const origin = startingPoint.values_.geometry.flatCoordinates;
    const destiny = stadiumSelect.value.split(",").map(str => parseFloat(str));

    getAddressPopup().setPosition(origin);
    getAddressPopupElement().removeAttribute('hidden');
    getAddressPopupElement().innerText = startingPoint.values_label;

    const from = origin;
    const to = destiny;

    const decodedShape = await getOptimizedRoute(from, to);
    const shapePoints = decodedShape.map(coord => [coord[1], coord[0]]); //coordinates come flipped
    const transformedPoints = shapePoints.map(coord => ol.proj.transform(
        coord,
        turfProjection,
        mapContext.projection
    ));
    const route = new ol.Feature({
        geometry: new ol.geom.LineString(transformedPoints)
    });
    routeSource.clear();
    routeSource.addFeatures(route);

    map.getView().fit(routeSource.getExtent(), {
        padding: [100, 100, 100, 100]
    });
}

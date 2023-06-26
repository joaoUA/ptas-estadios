const startingPointInput = document.getElementById('input-starting-address');
const btnGetStartingPoints = document.getElementById('btn-get-address');

btnGetStartingPoints.addEventListener('click', async () => {

    startPointsLayer.getSource().clear();
    routeLayer.getSource().clear();

    const address = startingPointInput.value.trim();
    if (!address || stadiumSelect.value === defaultSelectValue)
        return;
    const addressCoords = await getAddressCoordinates(address);

    const startingPointsFeatures = addressCoords.features.map(feat =>
        new ol.Feature({
            geometry: new ol.geom.Point(feat.geometry.coordinates).transform(
                'EPSG:4326',
                'EPSG:3857'),
            label: feat.properties.label
        }));
    startPointsLayer.getSource().addFeatures(startingPointsFeatures);

    const startingPointsContainer = document.getElementById('starting-points-container');
    startingPointsContainer.innerHTML = "";
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

    console.log(getAddressPopup());
    console.log(getAddressPopupElement());

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
        'EPSG:3857'
    ));
    const route = new ol.Feature({
        geometry: new ol.geom.LineString(transformedPoints)
    });
    routeLayer.getSource().clear();
    routeLayer.getSource().addFeatures(route);

    console.log(routeLayer.getSource());


    //todo: not getting any features?????
    map.getView().fit(routeLayer.getSource().getExtent(), {
        padding: [100, 100, 100, 100]
    });
}

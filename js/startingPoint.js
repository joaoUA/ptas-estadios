const startingPointInput = document.getElementById('input-starting-address');
const btnGetStartingPoints = document.getElementById('btn-get-address');

btnGetStartingPoints.addEventListener('click', async () => {

    startPointsLayer.getSource().clear();
    routeLayer.getSource().clear();

    const address = startingPointInput.value.trim();
    if (!address) {
        alert('Introduza um endereço como ponto de partida');
        return;
    }
    if (stadiumSelect.value === defaultSelectValue) {
        alert('Selecione um estádio');
        return;
    }
    const addressCoords = await getAddressCoordinates(address);

    console.log(addressCoords);

    const startingPointsFeatures = addressCoords.features.map(feat =>
        new ol.Feature({
            geometry: new ol.geom.Point(feat.geometry.coordinates).transform(
                'EPSG:4326',
                'EPSG:3857'),
            label: feat.properties.label
        }));
    startPointsLayer.getSource().addFeatures(startingPointsFeatures);

    const startingPointsContainer = document.getElementById('starting-points-list');
    startingPointsContainer.innerHTML = "";
    startingPointsFeatures.forEach(feat => {
        const parent = document.createElement('li');
        parent.classList.add('starting-point');

        const icon = document.createElement('i');
        icon.classList.add('fa-solid');
        icon.classList.add('fa-location-dot');

        const title = document.createElement('p');
        title.innerText = feat.values_.label;

        parent.appendChild(icon);
        parent.appendChild(title);
        startingPointsContainer.appendChild(parent);

        parent.addEventListener('click', () => {
            try {
                calculateRoute(feat)
            } catch (error) {
            }
        });
    })
});

async function getAddressCoordinates(address) {
    const geocodingAPI = '5b3ce3597851110001cf6248effbb3f392b94119b82ddf1d0a903043';
    const baseURL = 'https://api.openrouteservice.org/geocode/search';

    const url = new URL(baseURL);
    url.searchParams.append('api_key', geocodingAPI);
    url.searchParams.append('text', address);
    url.searchParams.append('boundary.country', 'PT');

    try {
        return await fetchData(url);
    } catch (error) {
        alert("Não foi possível obter a localização do endereço: " + address);
        return null;
    }
}

async function calculateRoute(startingPoint) {
    routeLayer.getSource().clear();

    const origin = startingPoint.values_.geometry.flatCoordinates;
    const destiny = stadiumSelect.value.split(",").map(str => parseFloat(str));

    getAddressPopup().setPosition(origin);
    getAddressPopupElement().removeAttribute('hidden');
    getAddressPopupElement().innerText = startingPoint.values_.label;

    const decodedShape = await getOptimizedRoute(origin, destiny);
    if (decodedShape == null)
        return;
    const shapePoints = decodedShape.map(coord => [coord[1], coord[0]]); //coordinates come flipped
    const transformedPoints = shapePoints.map(coord => ol.proj.transform(
        coord,
        'EPSG:4326',
        'EPSG:3857'
    ));
    const route = new ol.Feature({
        geometry: new ol.geom.LineString(transformedPoints),
        style: routeStyle
    });
    routeLayer.getSource().addFeature(route);

    map.getView().fit(routeLayer.getSource().getExtent(), {
        padding: [100, 100, 100, 100]
    });
}

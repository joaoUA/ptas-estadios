'use strict'
const targetElement = document.getElementById('map');
const poiContainer = document.getElementById('poi-list');
const stadiumSelect = document.getElementById('stadium-select');

const pgDataProjection = 'EPSG:3857';
const olMapProjection = 'EPSG:3857';
const turfProjection = 'EPSG:4326';
const geojsonFormat = new ol.format.GeoJSON();
const defaultSelectValue = "Escolha um estádio";

let poisCache = {};
const filters = new Map();

const defaultZoom = 6.2;
const defaultCenter = [-1_706_000, 4_606_000];
const view = new ol.View({
    center: defaultCenter,
    zoom: defaultZoom
});
const layers = [];
const map = new ol.Map({
    target: targetElement,
    layers: layers,
    view: view
});

//* LAYERS ORDER:
//* 5 - starting point
//* 4 - stadiums
//* 3 - points of interest
//* 2 - route from starting point to stadium
//* 1 - polygon around the map
//* 0 - map layers (osm, toner-lite, etc), layers that represente the world map

//Map base layers
const baseLayers = new ol.layer.Group({});
map.addLayer(baseLayers);

const tonerLite = new ol.layer.Tile({
    source: new ol.source.Stamen({
        layer: 'toner-lite'
    }),
    zIndex: 0,
});
baseLayers.getLayers().push(tonerLite);
tonerLite.setProperties({ 'name': 'toner-lite' });

const osmLayer = new ol.layer.Tile({
    source: new ol.source.OSM(),
    zIndex: 0,
});
baseLayers.getLayers().push(osmLayer);
osmLayer.setProperties({ 'name': 'osm' });
//Feature layers
const featLayers = new ol.layer.Group({});
map.addLayer(featLayers);

//Layer that will have the polygon around the stadium (result of the isochrone api call)
const polygonLayer = new ol.layer.Vector({
    title: 'hull',  //todo: test removing this
    source: new ol.source.Vector({}),
    zIndex: 1,
});
polygonLayer.setProperties({ 'name': 'polygon' });
featLayers.getLayers().push(polygonLayer);

const stadiumsLayer = new ol.layer.Vector({
    source: new ol.source.Vector({}),
    style: stadiumStyle,
    zIndex: 4
});
featLayers.getLayers().push(stadiumsLayer);
stadiumsLayer.setProperties({ 'name': 'stadiums' });

const poisLayer = new ol.layer.Vector({
    source: new ol.source.Vector({}),
    style: poiStyle,
    zIndex: 3
});
featLayers.getLayers().push(poisLayer);
poisLayer.setProperties({ 'name': 'points-of-interest' });

const startPointsLayer = new ol.layer.Vector({
    source: new ol.source.Vector({}),
    style: poiStyle,
    zIndex: 5,
});
featLayers.getLayers().push(startPointsLayer);
startPointsLayer.setProperties({ 'name': 'starting-points' });

const routeLayer = new ol.layer.Vector({
    source: new ol.source.Vector({}),
    style: routeStyle,
    zIndex: 2
})
featLayers.getLayers().push(routeLayer);
routeLayer.setProperties({ 'name': 'route' });

map.addOverlay(getPopup());
map.addOverlay(getAddressPopup());


run();

async function run() {
    //todo: 
    //talvez dá para melhorar ao resolver o casos dos estadios assim que completa (pq acaba primeiro que os PoIS)
    //em vez de estar à espera que ambos acabem e só depois agir
    const [stadiums, pointsOfInterest] = await Promise.all([getStadiumData(), getPointsOfInterestData()]);
    stadiumsLayer.getSource().addFeatures(geojsonFormat.readFeatures(stadiums));

    const blankOption = document.createElement('option');
    blankOption.selected = true;
    blankOption.disabled = true;
    blankOption.innerText = defaultSelectValue;
    stadiumSelect.appendChild(blankOption);

    Object.values(stadiums.features)
        .forEach(stadium => {
            const option = document.createElement('option');
            option.value = stadium.geometry.coordinates;
            option.innerText = stadium.properties.nome;
            stadiumSelect.appendChild(option);
        });

    stadiumSelect.addEventListener('change', async (event) => {
        const filtersModal = document.getElementById('filters-modal');
        if (!filtersModal.hidden)
            filtersModal.hidden = true;
        document.getElementById('stadium-info-container').hidden = false;

        const selectedIndex = event.target.selectedIndex;
        const selectedOption = event.target.options[selectedIndex];
        const stadiumCoords = selectedOption.value.split(',').map(str => parseFloat(str));

        let polygonFeats;
        try {
            polygonFeats = await getPolygonAroundStadium(stadiumCoords);
        } catch (error) {
            console.log(error);
            return;
        }
        polygonLayer.getSource().clear();
        stadiumsLayer.getSource().clear();
        poisLayer.getSource().clear();
        routeLayer.getSource().clear();

        polygonLayer.getSource().addFeatures(polygonFeats);

        map.getView().fit(polygonLayer.getSource().getExtent(), {
            padding: [100, 0, 100, map.getSize()[0] / 3]
        });

        const polygon = geojsonFormat.writeFeaturesObject(polygonFeats).features[0];
        //todo: change to only show one stadium, this could possibly show multiple
        const stadiumInPolygon = turf.pointsWithinPolygon(
            geojsonFormat.writeFeaturesObject(geojsonFormat.readFeatures(stadiums)),
            polygon
        );
        stadiumsLayer.getSource().addFeatures(geojsonFormat.readFeatures(stadiumInPolygon));

        const poisInPolygon = turf.pointsWithinPolygon(
            geojsonFormat.writeFeaturesObject(geojsonFormat.readFeatures(pointsOfInterest)),
            polygon
        );
        poisLayer.getSource().addFeatures(geojsonFormat.readFeatures(poisInPolygon));

        poisCache = {};
        filters.clear();
        clearPoISidebarList();

        poisInPolygon.features
            .forEach(poi => {
                poisCache[poi.id] = {
                    "poi": poi,
                    "hidden": false,
                };
                filters.set(poi.properties.categoria_id, {
                    nome: poi.properties.categoria,
                    icon: poi.properties.icon
                });
                generatePoISidebarList();
            });

    })

    //Simulate a click on the first available option
    const optionElements = stadiumSelect.getElementsByTagName('option');
    const randomIndex = Math.floor(Math.random() * (optionElements.length - 1)) + 1;
    const randomOption = optionElements[randomIndex];
    randomOption.selected = true;
    stadiumSelect.dispatchEvent(new Event('change'));
}
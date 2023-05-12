'use strict'
//#region HTML Elements
const targetElement = document.getElementById('map');
const stadiumSelect = document.getElementById('stadium-select');
const popupElement = document.getElementById('popup');
const stadiumHeading = document.getElementById('estadio-title');
const poiContainer = document.getElementById('poi-container');
const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
const filtersContainer = document.getElementById('poi-filters-container');
const filtersElement = document.getElementById('poi-filters');
const submitFiltersBtn = document.getElementById('submit-filters-btn');
//#endregion

//#region Globals
const pgDataProjection = 'EPSG:3857';
const olMapProjection = 'EPSG:3857';
const turfProjection = 'EPSG:4326';
const geojsonFormat = new ol.format.GeoJSON();

const mapContext = {
    view: null,
    layers: null,
    map: null,
    projection: olMapProjection,
}
const mapData = {
    stadiums: null,
    pois: null
}
const filters = new Set();
let poisCache = {};

async function fetchData(url) {
    const res = await fetch(url, {});
    return await res.json();
}
//#endregion

//#region Fetch Stadium Data
const stadiumDataUrl = 'http://localhost/ptas_test/php/get_stadiums.php';
async function getStadiumData() {
    try {
        const response = await fetchData(stadiumDataUrl);
        return await JSON.parse(response);
    }
    catch (error) {
        console.log(error);
        return;
    }
}
//#endregion

//#region Fetch Points of Interest Data
const poisDataUrl = 'http://localhost/ptas_test/php/get_pointsofinterest.php';
async function getPointsOfInterestData() {
    try {
        const response = await fetchData(poisDataUrl);
        return await JSON.parse(response);
    } catch (error) {
        console.log(error);
        return;
    }
}

//#endregion

//#region Fetch Routing Polygon
async function getRoutingPolygon(lon, lat, time, color) {
    const url =
        `https://routing.gis4cloud.pt/isochrone?json={"locations":[{"lat":${lat},"lon":${lon}}],"costing":"pedestrian","polygons":true,"contours":[{"time":15.0,"color":"000000"}]}&id=hull inicial`;
    return await fetchData(url);
}
//#endregion

//#region Populate Filters on Sidebar
toggleFiltersBtn.addEventListener('click', () => {
    if (filters.size === 0)
        return;
    filtersContainer.hidden = !filtersContainer.hidden;

    if (filtersContainer.hidden)
        return;
    filters.forEach(filter => {
        const node = document.createElement("div");
        node.classList.add("filter")
        const checkbox = document.createElement("input")
        checkbox.setAttribute("type", "checkbox")
        const label = document.createElement("label")
        label.innerText = filter

        node.setAttribute("id", "filter")
        node.appendChild(checkbox);
        node.append(label);
        filtersElement.appendChild(node)
    })
})
submitFiltersBtn.addEventListener('click', () => {
    filtersContainer.hidden = true;
})
//#endregion

//#region Define OpenLayers Styles

//#endregion

//#region Main Loop
async function run() {
    //#region Create OpenLayers Map
    const mapDefaults = {
        center: [-1706000, 4606000],
        zoom: 6.2
    };
    const mainView = new ol.View({
        center: mapDefaults.center,
        zoom: mapDefaults.zoom
    });
    const layers = [];
    const map = new ol.Map({
        target: targetElement,
        layers: layers,
        view: mainView
    });

    //OpenStreetMap Layer
    const osmLayer = new ol.layer.Tile({
        source: new ol.source.OSM(),
        zIndex: 0
    });
    map.addLayer(osmLayer);

    const polygonLayer = new ol.layer.Vector({
        title: "hull",
        source: new ol.source.Vector({}),
        zIndex: 1
    });
    map.addLayer(polygonLayer);

    const stadiumsSource = new ol.source.Vector({});
    const stadiumsLayer = new ol.layer.Vector({
        zIndex: 3,
        source: stadiumsSource,
        style: new ol.style.Style({
            image: new ol.style.Icon({
                src: "./img/estadio-96.png",
                scale: 0.3
            })
        })
    });
    map.addLayer(stadiumsLayer);

    const poisSource = new ol.source.Vector({});
    const poisLayer = new ol.layer.Vector({
        zIndex: 2,
        source: poisSource,
        //todo criar estilos para pois e estádios, em vez de seres criados aqui, reusar estilos
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 5,
                fill: new ol.style.Fill({
                    color: 'red'
                }),
                stroke: new ol.style.Stroke({
                    color: 'black',
                    width: 1
                })
            })
        })
    })
    map.addLayer(poisLayer);

    mapContext.view = mainView;
    mapContext.layers = layers;
    mapContext.map = map;
    //#endregion

    //#region Create Popup
    const popup = new ol.Overlay({
        element: popupElement,
        positioning: 'bottom-center',
        stopEvent: false,
    })
    mapContext.map.addOverlay(popup);

    function disposePopover() {
        if (!popupElement) return;
        popupElement.setAttribute("hidden", "hidden")
        popupElement.innerText = "";
    }
    //#endregion

    //Get Stadiums
    mapData.stadiums = await getStadiumData();
    //Get Points of Interest
    mapData.pois = await getPointsOfInterestData();

    //#region Populate Stadiums Select
    Object.values(mapData.stadiums.features).forEach(stadium => {
        const name = stadium.properties.nome;
        const position = stadium.geometry.coordinates;
        const node = document.createElement('option');
        node.value = position;
        node.innerText = name;

        stadiumSelect.appendChild(node);
    })
    const blankOption = document.createElement('option');
    blankOption.selected = true;
    blankOption.disabled = true;
    blankOption.textContent = "Escolha um estádio";
    stadiumSelect.insertBefore(blankOption, stadiumSelect.firstChild);
    //#endregion

    //#region On Stadium Option Select
    stadiumSelect.addEventListener('change', async () => {

        //#region Zoom To Selected Stadium Position
        const coordinates = stadiumSelect.value.split(",").map(str => parseFloat(str));
        mapContext.view.animate({
            center: coordinates,
            duration: 1000,
            zoom: 16,
            easing: ol.easing.easeOut
        })
        //#endregion

        //update stadium name on the sidebar
        stadiumHeading.innerHTML = stadiumSelect.selectedOptions[0].innerText;

        //#region Create Polygon Shape
        const source = pgDataProjection;
        const destination = turfProjection;
        const projectedCoordinates = ol.proj.transform(coordinates, source, destination);

        const lon = projectedCoordinates[0];
        const lat = projectedCoordinates[1];
        const time = 15.0;
        const color = '000000';
        let polygonsFeatures;
        try {
            polygonsFeatures = await getRoutingPolygon(lon, lat, time, color);
        } catch (error) {
            console.log(error);
            return;
        }
        const projectedPolygonsFeatures = geojsonFormat.readFeatures(polygonsFeatures, {
            dataProjection: turfProjection, //from
            featureProjection: mapContext.projection  //to
        });
        polygonLayer.getSource().clear();
        polygonLayer.getSource().addFeatures(projectedPolygonsFeatures);
        stadiumsSource.clear();
        poisSource.clear();

        map.getView().fit(polygonLayer.getSource().getExtent(), {
            padding: [100, 100, 100, 20]
        });
        //#endregion

        //#region Get Overlapping Points of Interest & Stadiums
        const firstPolygon = geojsonFormat.writeFeaturesObject(projectedPolygonsFeatures).features[0];

        const stadiumInPolygon = turf.pointsWithinPolygon(
            geojsonFormat.writeFeaturesObject(geojsonFormat.readFeatures(mapData.stadiums)),
            firstPolygon
        );
        stadiumsSource.addFeatures(geojsonFormat.readFeatures(stadiumInPolygon));

        const poisInPolygon = turf.pointsWithinPolygon(
            geojsonFormat.writeFeaturesObject(geojsonFormat.readFeatures(mapData.pois)),
            firstPolygon
        );
        poisSource.addFeatures(geojsonFormat.readFeatures(poisInPolygon));
        //#endregion

        //#region Populate Sidebar w/ PoIs' Information & Update Popup on PoI Hover
        poiContainer.innerHTML = "";
        poisCache = {};
        filters.clear();
        console.log(poisInPolygon.features);
        poisInPolygon.features.forEach(poi => {
            poisCache[poi.id] = poi;
            filters.add(poi.properties.categoria);

            const node = document.createElement('div');
            node.classList.add('poi');
            node.setAttribute("data-id", poi.id);
            const title = document.createElement('h4');
            title.classList.add('poi-titulo');
            title.innerText = poi.properties.nome;
            const category = document.createElement('p');
            category.innerText = poi.properties.categoria;
            category.classList.add('poi-categoria');

            node.appendChild(title);
            node.appendChild(category);
            poiContainer.appendChild(node);

            node.addEventListener('mouseenter', () => {
                const feature = poisCache[node.dataset.id];
                const coordinates = feature.geometry.coordinates;
                popup.setPosition(coordinates);
                popupElement.removeAttribute("hidden");
                popupElement.innerText = feature.properties.nome;
            })
            node.addEventListener('mouseleave', disposePopover);
        })
        //#endregion
    })
    //#endregion
}

run();
//#endregion

//Estilos
const mainFill = new ol.style.Fill({
    color: 'red'
})
const secondaryFill = new ol.style.Fill({
    color: 'white'
})
const mainStroke = new ol.style.Stroke({
    color: 'black',
    width: 1
})

const originaPoIStyle = new ol.style.Style({
    image: new ol.style.Circle({
        radius: 5,
        fill: mainFill,
        stroke: mainStroke
    })
})


const hoverFill = new ol.style.Fill({
    color: 'blue'
})

const hoverStroke = new ol.style.Stroke({
    color: 'black',
    width: 2
})

const hoverStyle = new ol.style.Style({
    fill: hoverFill,
    stroke: hoverStroke,
    image: new ol.style.Circle({
        radius: 10,
        fill: hoverFill,
        stroke: hoverStroke
    })
})
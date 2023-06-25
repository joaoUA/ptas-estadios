'use strict'
//#region HTML Elements
const targetElement = document.getElementById('map');
const stadiumSelect = document.getElementById('stadium-select');

const stadiumHeading = document.getElementById('estadio-title');
const poiContainer = document.getElementById('poi-container');

//#endregion

const pgDataProjection = 'EPSG:3857';
const olMapProjection = 'EPSG:3857';
const turfProjection = 'EPSG:4326';
const geojsonFormat = new ol.format.GeoJSON();
const defaultSelectValue = "Escolha um estádio";

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
let poisCache = {};
const filters = new Set();

//#region Helpers
async function fetchData(url) {
    const res = await fetch(url, {});
    return await res.json();
}
function clearPoISidebarList() {
    poiContainer.innerHTML = '';
}
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
        source: new ol.source.Stamen({
            layer: 'toner-lite'
        })
    });
    map.addLayer(osmLayer);
    osmLayer.setProperties({ "name": "osm" });

    const polygonLayer = new ol.layer.Vector({
        title: "hull",
        source: new ol.source.Vector({}),
        zIndex: 1
    });
    map.addLayer(polygonLayer);
    polygonLayer.setProperties({ "name": "polygon" })

    const stadiumsSource = new ol.source.Vector({});
    const stadiumsLayer = new ol.layer.Vector({
        zIndex: 4,
        source: stadiumsSource,
        style: stadiumStyle
    });
    map.addLayer(stadiumsLayer);
    stadiumsLayer.setProperties({ "name": "stadiums" })

    const poisSource = new ol.source.Vector({});
    const poisLayer = new ol.layer.Vector({
        zIndex: 3,
        source: poisSource,
        style: poiStyle,
        name: 'pois'
    })
    map.addLayer(poisLayer);

    const addrSource = new ol.source.Vector({});
    const addrLayer = new ol.layer.Vector({
        zIndex: 5,
        source: addrSource,
        style: poiStyle,
        name: 'addr'
    });
    map.addLayer(addrLayer)

    const routeSource = new ol.source.Vector({});
    const routeLayer = new ol.layer.Vector({
        zIndex: 2,
        source: routeSource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'purple', // Set the stroke color
                width: 5, // Set the stroke width
                //lineDash: [5, 5] // Set the line dash pattern (optional)
            })
        })
    });
    map.addLayer(routeLayer);

    mapContext.view = mainView;
    mapContext.layers = layers;
    mapContext.map = map;
    mapContext.map.addOverlay(popup);
    mapContext.map.addOverlay(addressPopup);
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
    blankOption.textContent = defaultSelectValue;
    stadiumSelect.insertBefore(blankOption, stadiumSelect.firstChild);
    //#endregion
    console.log(mapData);
    stadiumsSource.addFeatures(geojsonFormat.readFeatures(mapData.stadiums));

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
        routeSource.clear();

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
        poisCache = {};
        filters.clear();
        clearPoISidebarList();
        poisInPolygon.features.forEach(poi => {
            poisCache[poi.id] = { "poi": poi, "hidden": false };
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
            document.getElementById('poi-container').appendChild(node);

            node.addEventListener('mouseenter', () => {
                const feature = poisCache[node.dataset.id].poi;
                const coordinates = feature.geometry.coordinates;
                popup.setPosition(coordinates);
                popupElement.removeAttribute("hidden");
                popupElement.innerText = feature.properties.nome;
            })
            node.addEventListener('mouseleave', () => { disposePopover(popupElement) });
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
const estadioSelect = document.getElementById('stadium-select');
const toggleFilters = document.getElementById("toggle-filters-btn");
const filtersContainer = document.getElementById("poi-filters-container")
const filtersElement = document.getElementById("poi-filters");
const submitFilters = document.getElementById("submit-filters-btn");

const defaults = {
    mapCenter: [-1106000, 4806000],
    mapZoom: 7,

    estadiosLayerMinZoom: 5,
    estadiosLayerMaxZoom: 30,

    poiLayerMinZoom: 12,
    poiLayerMaxZoom: 30,
}

const geojsonFormat = new ol.format.GeoJSON();

const estadioCache = {}
let poiCache = {}
const filters = new Set()

async function fetchData() {
    const url = 'http://localhost/ptas_test/db.php'
    const res = await fetch(url, {})
    return res.json();
}

async function main() {
    try {
        const response = await fetchData();

        const estadios = JSON.parse(response[0]);
        const poiBares = JSON.parse(response[1]);

        const estadiosSource = new ol.source.Vector({
            features: geojsonFormat.readFeatures(estadios)
        })
        const estadiosTurf = geojsonFormat.writeFeaturesObject(estadiosSource.getFeatures());

        const poiBaresSource = new ol.source.Vector({
            features: geojsonFormat.readFeatures(poiBares)
        })

        const poiTurf = geojsonFormat.writeFeaturesObject(poiBaresSource.getFeatures());

        const estadiosLayer = new ol.layer.Vector({
            zIndex: 2,
            maxZoom: defaults.estadiosLayerMaxZoom,
            minZoom: defaults.estadiosLayerMinZoom,
            source: estadiosSource,
            style: new ol.style.Style({
                image: new ol.style.Icon({
                    src: "./img/estadio-96.png",
                    scale: 0.3
                })
            })
        })

        const poiBaresLayer = new ol.layer.Vector({
            source: poiBaresSource,
            zIndex: 2,
            style: originaPoIStyle
        })

        const osmLayer = new ol.layer.Tile({
            source: new ol.source.OSM(),
            zIndex: 1
        });

        //Hull
        const source_hull = new ol.source.Vector({})
        const hull = new ol.layer.Vector({
            title: 'hull',
            source: source_hull,
            zIndex: 1
        })
        let hull_turf;


        const layers = [osmLayer, estadiosLayer, poiBaresLayer, hull]

        const view = new ol.View({
            center: defaults.mapCenter,
            zoom: defaults.mapZoom,
        })


        //Estadios
        const map = new ol.Map({
            target: document.getElementById('map'),
            layers: layers,
            view: view
        });

        const element = $('#popup')[0];
        const popup = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: false,
        })
        map.addOverlay(popup)

        function disposePopover() {
            if (element) {
                element.setAttribute("hidden", "hidden")
                element.innerText = "";
            }
        }

        map.on('click', function (evt) {
            const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
            disposePopover();
            if (!feature) return;
            if (feature.values_.features) return;
            if (feature.values_.nome === undefined) return;

            const coordenadas = feature.values_.geometry.flatCoordinates;
            popup.setPosition(coordenadas)
            element.removeAttribute("hidden")
            element.innerText = feature.values_.nome;

        })

        map.on('pointermove', function (e) {
            const pixel = map.getEventPixel(e.originalEvent);
            const hit = map.hasFeatureAtPixel(pixel);
            map.getTarget().style.cursor = hit ? 'pointer' : '';
        });

        map.on('movestart', disposePopover);


        //Popular Selects
        Object.values(estadios.features).map(std => {
            const nome = std.properties.nome
            const pos = std.geometry.coordinates
            const node = document.createElement('option')
            node.value = pos;
            node.innerText = nome;
            return node;
        }).forEach(opt => estadioSelect.appendChild(opt))

        estadioSelect.addEventListener('change', async function () {
            if (estadioSelect.value === "") return;
            const coordenadas = estadioSelect.value.split(',')
            coordenadas[0] = parseFloat(coordenadas[0])
            coordenadas[1] = parseFloat(coordenadas[1])

            const coords = ol.proj.transform(coordenadas, 'EPSG:3857', 'EPSG:4326')
            const lon = coords[0]
            const lat = coords[1]


            view.animate({
                center: coordenadas,
                duration: 1000,
                zoom: 16,
                easing: ol.easing.easeOut
            })
            $('#estadio')[0].innerText = $('option:selected')[0].innerText

            //polígono com área alcancável a pé em 15 minutos desde o estádio indicado
            const routing_url = 'https://routing.gis4cloud.pt/isochrone?json=' +
                '{"locations":[{"lat":' + lat + ',"lon":' + lon + '}],' +
                '"costing":"pedestrian","polygons":true,"contours":[{"time":15.0,"color":"000000"}]}&id=hull inicial'

            try {
                const response = await fetch(routing_url);
                const dados = await response.json();
                source_hull.clear();
                //const feats = geojsonFormat.readFeatures(dados);
                hull_turf = geojsonFormat.writeFeaturesObject(geojsonFormat.readFeatures(dados, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                }));
                console.log(hull_turf);
                source_hull.addFeatures(geojsonFormat.readFeatures(dados, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                }));

                const hullPolygon = turf.getGeom(hull_turf.features[0]);
                const estadiosDentro = turf.pointsWithinPolygon(estadiosTurf, hullPolygon);
                // console.log(estadiosDentro);
                const poiBaresDentro = turf.pointsWithinPolygon(poiTurf, hullPolygon);
                // console.log(poiBaresDentro);

                hull.setVisible(true);
                map.getView().fit(source_hull.getExtent())

                poiCache = {}
                poiBaresDentro.features.forEach(poi => {
                    filters.add(poi.properties.categoria)
                    poiCache[poi.id] = poi
                })
                console.log(filters)

                estadiosLayer.setVisible(true);
                estadiosLayer.getSource().clear();
                estadiosSource.addFeatures(geojsonFormat.readFeatures(estadiosDentro));
                estadiosLayer.getSource().addFeatures(geojsonFormat.readFeatures(estadiosDentro));

                poiBaresLayer.setVisible(true);
                poiBaresLayer.getSource().clear();
                poiBaresSource.addFeatures(geojsonFormat.readFeatures(poiBaresDentro));
                poiBaresLayer.getSource().addFeatures(geojsonFormat.readFeatures(poiBaresDentro));

                const poiContainer = document.getElementById("poi-container")
                poiContainer.innerHTML = ""

                Object.values(poiCache).forEach(poi => {
                    const node = document.createElement("div");
                    node.classList.add("poi")
                    node.setAttribute("data-id", poi.id);
                    const titulo = document.createElement("h4")
                    titulo.classList.add("poi-titulo")
                    titulo.innerText = poi.properties.nome
                    const categoria = document.createElement("p")
                    categoria.innerText = poi.properties.categoria
                    categoria.classList.add("poi-categoria")

                    node.appendChild(titulo)
                    node.appendChild(categoria)
                    poiContainer.appendChild(node)

                    node.addEventListener("click", () => {
                    })

                    node.addEventListener("mouseenter", () => {
                        const feature = poiCache[node.dataset.id];
                        const coordenadas = feature.geometry.coordinates;
                        popup.setPosition(coordenadas)
                        element.removeAttribute("hidden")
                        element.innerText = feature.properties.nome;
                    })
                    node.addEventListener("mouseleave", disposePopover)

                })

            } catch (error) {
                console.error('Error fetching routing data:', error);
            }
        })

    } catch (error) {
        console.log(error);
    }
}

main();

toggleFilters.addEventListener("click", () => {
    if (filters.size == 0) return

    filtersElement.innerHTML = ""

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
        /*
                    <div class="filter">
                            <input type="checkbox" name="" id="">
                            <label for="">test</label>
                        </div>
        */
    })

    filtersContainer.style.display = "block"
})
submitFilters.addEventListener("click", () => {
    filtersContainer.style.display = "none"
})

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
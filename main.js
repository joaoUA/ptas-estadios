const estadioSelect = document.getElementById('stadium-select');


const defaults = {
    mapCenter: [-1106000, 4806000],
    mapZoom: 7,

    estadiosLayerMinZoom: 5,
    estadiosLayerMaxZoom: 30,

    poiLayerMinZoom : 12,
    poiLayerMaxZoom : 30,
}

const geojsonFormat = new ol.format.GeoJSON();

async function fetchData(){
    const url = 'http://localhost/ptas_test/db.php'
    const res = await fetch(url, {})
    return res.json();
}

async function main(){
    try{
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

        const estadiosLayer = new ol.layer.Vector({
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

        const osmLayer = new ol.layer.Tile({
            source: new ol.source.OSM()
        });

        //Hull
        const source_hull = new ol.source.Vector({})
        const hull = new ol.layer.Vector({
            title: 'hull',
            source: source_hull
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

        function disposePopover(){
            if(element){
                element.setAttribute("hidden", "hidden")
                element.innerText = "";
            }
        }

        map.on('click', function(evt){
            const feature = map.forEachFeatureAtPixel(evt.pixel, (feature)=>feature);
            disposePopover();
            if(!feature) return;
            if(feature.values_.features) return;

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
        Object.values(estadios.features).map( std => {
            const nome = std.properties.nome
            const pos = std.geometry.coordinates
            const node = document.createElement('option')
            node.value = pos;
            node.innerText = nome;
            return node;
        }).forEach( opt => estadioSelect.appendChild(opt))

        estadioSelect.addEventListener('change', async function(){
            if(estadioSelect.value === "") return;
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
            
            const routing_url = 'https://routing.gis4cloud.pt/isochrone?json=' +
            '{"locations":[{"lat":' + lat + ',"lon":' + lon +'}],' +
            '"costing":"pedestrian","polygons":true,"contours":[{"time":15.0,"color":"000000"}]}&id=hull inicial'


            $.ajax({
                url: routing_url, async: false, success: function(dados){
                    source_hull.clear();
                    //const feats = geojsonFormat.readFeatures(dados);
                    //hull_turf = geojsonFormat.writeFeaturesObject(feats);
                    source_hull.addFeatures(geojsonFormat.readFeatures(dados, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    }));
                }
            })

            hull.setVisible(true);

            map.getView().fit(source_hull.getExtent())
            
        })

    } catch (error){
        console.log(error);
    }
}

main();


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
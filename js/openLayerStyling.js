//Points of Interest Styling
const poiFill = new ol.style.Fill({
    color: '#f1faee',
});
const poiStroke = new ol.style.Stroke({
    color: '#1d3557',
    width: 2,
});
const poiImage = new ol.style.Circle({
    radius: 4,
    fill: poiFill,
    stroke: poiStroke,
});
const poiStyle = new ol.style.Style({
    image: poiImage,
});

const poiHiddenStyle = new ol.style.Style({});

//Stadiums Styling
const stadiumIcon = new ol.style.Icon({
    src: './img/estadio-96.png',
    scale: 0.3,
});
const stadiumStyle = new ol.style.Style({
    image: stadiumIcon,
});

//Route Styling
const routeStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: '#457b9d',
        width: 5,
    })
})
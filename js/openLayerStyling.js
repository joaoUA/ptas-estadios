//Points of Interest Styling
const poiFill = new ol.style.Fill({
    color: 'red',
});
const poiStroke = new ol.style.Stroke({
    color: 'black',
    width: 1,
});
const poiImage = new ol.style.Circle({
    radius: 5,
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
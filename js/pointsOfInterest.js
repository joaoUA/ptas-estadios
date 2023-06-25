const poisDataUrl = 'http://localhost/ptas-estadios/php/get_pointsofinterest.php';
async function getPointsOfInterestData() {
    try {
        const response = await fetchData(poisDataUrl);
        return await JSON.parse(response);
    } catch (error) {
        console.log(error);
        return;
    }
}
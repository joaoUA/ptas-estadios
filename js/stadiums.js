const stadiumDataUrl = 'http://localhost/ptas-estadios/php/get_stadiums.php';
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
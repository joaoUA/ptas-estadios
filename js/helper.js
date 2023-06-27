async function fetchData(url) {
    const res = await fetch(url, {});
    return await res.json();
}
function clearPoISidebarList() {
    poiContainer.innerHTML = '';
}

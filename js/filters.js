const filtersModal = document.getElementById('filters-modal');
const filtersContainer = document.getElementById('filters-container');

const filtersBtn = document.getElementById('toggle-filters-btn');
filtersBtn.addEventListener('click', () => {
    if (filters.size === 0)
        return;
    filtersModal.hidden = !filtersModal.hidden;
    if (filtersModal.hidden)
        return;

    generateFiltersElements();
})
function generateFiltersElements() {
    filtersContainer.innerHTML = "";
    for (const [id, { nome, icon }] of filters) {
        const parent = document.createElement('li');
        parent.setAttribute('data-id', id);

        const checkbox = document.createElement('input');
        checkbox.setAttribute('type', 'checkbox');
        checkbox.checked = true;

        const iconElement = document.createElement('i');
        iconElement.classList.add('fa-solid');
        iconElement.classList.add(icon);

        const title = document.createElement('p');
        title.innerText = nome;

        parent.addEventListener('click', () => checkbox.checked = !checkbox.checked);

        parent.appendChild(checkbox);
        parent.appendChild(iconElement);
        parent.appendChild(title);

        filtersContainer.appendChild(parent);
    }
}

const applyFiltersBtn = document.getElementById('submit-filters-btn');
applyFiltersBtn.addEventListener('click', () => {
    filtersModal.hidden = true;

    //Get checked filters in modal
    const categoriesChecked = [];
    const filtersElements = Array.from(filtersContainer.querySelectorAll('li'));
    filtersElements.forEach(element => {
        const checkbox = element.querySelector('input[type="checkbox"]');
        const categoryId = parseInt(element.getAttribute('data-id'));

        if (checkbox.checked)
            categoriesChecked.push(categoryId);
    })

    //Filter features on Point of Interests Layers
    //todo: GET REF TO POI LAYER
    if (poisLayer === null || poisLayer === undefined)
        return;

    poisLayer.getSource().getFeatures().forEach(feat => {
        const featId = feat.id_
        const featCategoryIsChecked = categoriesChecked.includes(feat.getProperties().categoria_id);

        if (featCategoryIsChecked) {
            feat.setStyle(poiStyle);
            poisCache[parseInt(featId)].hidden = false;
        } else {
            feat.setStyle(poiHiddenStyle);
            poisCache[parseInt(featId)].hidden = true;
        }
    })

    clearPoISidebarList();
    generatePoISidebarList();

})
function generatePoISidebarList() {
    Object.keys(poisCache)
        .filter(poiId => !poisCache[poiId].hidden) //get not hidden PoIs
        .forEach(poiId => {

            const poi = poisCache[poiId].poi;

            const poiItem = document.createElement('li');
            poiItem.classList.add('poi');
            poiItem.setAttribute("data-id", poi.id);

            const title = document.createElement('p');
            title.innerText = poi.properties.nome;

            const icon = document.createElement('i');
            icon.classList.add('fa-solid');
            icon.classList.add(poi.properties.icon);

            poiItem.appendChild(icon);
            poiItem.appendChild(title);
            poiContainer.appendChild(poiItem);

            poiItem.addEventListener('mouseenter', () => {
                const feature = poisCache[poiItem.dataset.id].poi;
                const coordinates = feature.geometry.coordinates;
                getPopup().setPosition(coordinates);
                getPopupElement().removeAttribute('hidden');
                getPopupElement().innerText = feature.properties.nome;
            })
            poiItem.addEventListener('mouseleave', () => { disposePopover(popupElement) });
        });
}

//Reset (select all) filters
const resetFiltersBtn = document.getElementById('reset-filters-btn');
resetFiltersBtn.addEventListener('click', () => {
    const filtersCheckboxes = Array.from(filtersContainer.querySelectorAll('input[type="checkbox"]'));
    console.log(filtersCheckboxes);
    filtersCheckboxes.forEach(checkbox => checkbox.checked = true);
})

//Unselect all filters
const clearFiltersBtn = document.getElementById('clear-filters-btn');
clearFiltersBtn.addEventListener('click', () => {
    const filtersCheckboxes = Array.from(filtersContainer.querySelectorAll('input[type="checkbox"]'));
    filtersCheckboxes.forEach(checkbox => checkbox.checked = false);
})
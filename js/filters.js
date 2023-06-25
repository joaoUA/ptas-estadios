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
    filters.forEach(filter => {
        const parent = document.createElement('div');
        parent.classList.add('filter');

        const checkbox = document.createElement('input');
        checkbox.setAttribute('type', 'checkbox');
        checkbox.checked = true;

        const label = document.createElement('label');
        label.innerText = filter;

        //parent.setAttribute('id', filter)
        parent.appendChild(checkbox);
        parent.append(label);

        filtersContainer.appendChild(parent);
    })
}

const applyFiltersBtn = document.getElementById('submit-filters-btn');
applyFiltersBtn.addEventListener('click', () => {
    filtersModal.hidden = true;

    //Get checked filters in modal
    const categoriesChecked = [];
    const filtersElements = Array.from(filtersContainer.getElementsByClassName('filter'));
    filtersElements.forEach(element => {
        const checkbox = element.querySelector('input[type="checkbox"]');
        const label = element.querySelector('label');

        if (checkbox.checked)
            categoriesChecked.push(label.innerText);
    })

    //Filter features on Point of Interests Layers
    //todo: GET REF TO POI LAYER
    const poisLayer = mapContext.map.getLayers().getArray().filter(layer => layer.getProperties().name === 'pois')[0];
    if (poisLayer === null || poisLayer === undefined)
        return;

    poisLayer.getSource().getFeatures().forEach(feat => {
        const featId = feat.id_;
        const featCategoryIsChecked = categoriesChecked.includes(feat.getProperties().categoria);

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

            const parent = document.createElement('div');
            parent.classList.add('poi');
            parent.setAttribute('data-id', poi.id);


            const poiTitle = document.createElement('h4');
            poiTitle.classList.add('poi-titulo');
            poiTitle.innerText = poi.properties.nome;

            const poiCategory = document.createElement('p');
            poiCategory.classList.add('poi-categoria');
            poiCategory.innerText = poi.properties.categoria;

            parent.appendChild(poiTitle);
            parent.appendChild(poiCategory);
            poiContainer.appendChild(parent);

            parent.addEventListener('mouseenter', () => {
                const feature = poisCache[parent.dataset.id].poi;
                const coordinates = feature.geometry.coordinates;
                popup.setPosition(coordinates);
                popupElement.removeAttribute('hidden');
                popupElement.innerText = feature.properties.nome;
            });
            parent.addEventListener('mouseleave', () => disposePopover(popupElement));
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
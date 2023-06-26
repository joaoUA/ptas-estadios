const popupElement = document.getElementById('popup');
const popup = new ol.Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    stopEvent: false,
});
function getPopup() { return popup; }
function getPopupElement() { return popupElement; }

function disposePopover(popup) {
    if (!popup) return;
    popup.setAttribute('hidden', 'hidden');
    popup.innerText = "";
}

const addressPopupElement = document.getElementById('address-popup');
const addressPopup = new ol.Overlay({
    element: addressPopupElement,
    positioning: 'bottom-center',
    stopEvent: false,
});
function getAddressPopup() { return addressPopup; };
function getAddressPopupElement() { return addressPopupElement; }
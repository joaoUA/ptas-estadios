const minutesSlider = document.getElementById('input-minutes');
const minutesLabel = document.getElementById('minutes-label');
minutesSlider.addEventListener('change', () => {
    // const value = parseInt(minutesSlider.value);
    // minutesLabel.innerText = `${value} minutos`;
})

minutesSlider.addEventListener('input', () => {
    const value = parseInt(minutesSlider.value);
    minutesLabel.innerText = `${value} minutos`;

})
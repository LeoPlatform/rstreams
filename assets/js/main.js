function toggleLink(elName, show) {

    let el = document.getElementById(elName);
    if (show) {
        el.classList.add('show');
    } else {
        el.classList.remove('show');
    }
}
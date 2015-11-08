import Globals from 'js/globals';
import PageManager from 'js/pagemanager.js';

let globalError = $(Globals.Errors.locations.global);
let Ui = {
    Login: {}
};

Ui.init = () => {
    Ui.pageManager = new PageManager();
    Ui.pageManager.goToPage(Globals.Pages.login);
};

Ui.displayError = (message, location = globalError) => {
    location.html(message).show();
};

Ui.hideError = (location = globalError) => {
    location.html('').hide();
}

Ui.Login.init = (onSubmit) => {
    $(Globals.Login.form).submit(onSubmit);
};

Ui.Login.getUserName = () => {
    return $(Globals.Login.form).get(0).elements.user.value;
};

Ui.Login.getPassword = () => {
    return $(Globals.Login.form).get(0).elements.password.value;
};

export default Ui;

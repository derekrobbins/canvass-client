import Globals from 'js/globals';
import PageManager from 'js/pagemanager.js';

let Ui = {
    Login: {}
};

Ui.init = () => {
    Ui.pageManager = new PageManager();
    Ui.pageManager.goToPage(Globals.Pages.login);
};

Ui.Login.init = () => {
    return new Promise(function(resolve, reject) {
        $(Globals.Login.form).submit((e) => {
            e.preventDefault();
            resolve();
        });
    });
};

Ui.Login.getUserName = () => {
    return $(Globals.Login.form).get(0).elements.user.value;
};

Ui.Login.getPassword = () => {
    return $(Globals.Login.form).get(0).elements.password.value;
};

export default Ui;

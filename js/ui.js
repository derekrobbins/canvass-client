import Globals from 'js/globals';
import PageManager from 'js/pagemanager.js';

let Ui = {
    Login: {}
};
let activePage;

function setUpClickHandlers() {
    $(Globals.gotoSelector).click((e) => {
        let el = $(e.currentTarget);
        let data = el.data();
        let to = data.goto;
        let direction = data.direction + 'Class';
        let active = el.closest(Globals.pageSelector);

        activePage = active;
    });

    $(Globals.goBackSelector).click((e) => {
        doPageTransition(history.pop());
    });
}

Ui.init = () => {
    Ui.pageManager = new PageManager();
    Ui.pageManager.goToPage(Globals.Pages.login);
    setUpClickHandlers();
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

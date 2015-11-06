import Globals from 'js/globals';
let Ui = {
    Login: {}
};
let history = [];
let activePage;

function getOppositeDirection(direction) {
    let map = {};
    map[Globals.topClass] = Globals.bottomClass;
    map[Globals.bottomClass] = Globals.topClass;
    map[Globals.leftClass] = Globals.rightClass;
    map[Globals.rightClass] = Globals.leftClass;
    return map[direction];
}

function doPageTransition(data) {
    data.to.addClass(Globals.activeClass);
    data.from.removeClass(Globals.directionClasses).removeClass(Globals.activeClass);
}

function setUpClickHandlers() {
    $(Globals.gotoSelector).click((e) => {
        let el = $(e.currentTarget);
        let data = el.data();
        let to = data.goto;
        let direction = data.direction + 'Class';
        let active = el.closest(Globals.pageSelector);

        activePage = active;
        Ui.goToPage(to, direction);
    });

    $(Globals.goBackSelector).click((e) => {
        doPageTransition(history.pop());
    });
}

Ui.init = () => {
    setUpClickHandlers();
    activePage = $('.page.active');
};

Ui.goToPage = (toSelector, direction) => {
    let to = $(toSelector);
    history.push({
        from: to,
        direction: getOppositeDirection(direction),
        to: activePage
    });
    doPageTransition({
        from: activePage,
        direction: direction,
        to: to
    });
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

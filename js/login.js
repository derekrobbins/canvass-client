import Ui from 'js/ui';
import Globals from 'js/globals';

let Login = {};

function onLoginSubmit(resolve, reject) {
    // authenticate user/pass
    Ui.goToPage(Globals.mainWindow, Globals.leftClass);
}

Login.init = function() {
    return Ui.Login.init().then(onLoginSubmit);
};

export default Login;

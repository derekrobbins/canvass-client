import Ui from 'js/ui';
import Globals from 'js/globals';
import Settings from 'js/settings';

let Login = {};

function onLoginSubmit(resolve, reject) {
    // authenticate user/pass
    if(location.hash === '#noauth') {
        Ui.pageManager.goToPage(Globals.Pages.chat);
        return;
    }
    $.ajax({
        url: Settings.host,
        method: 'post',
        dataType: 'json',
        data: {
            user: Ui.Login.getUserName(),
            password: Ui.Login.getPassword()
        }
    });
}

Login.init = function() {
    return Ui.Login.init().then(onLoginSubmit);
};

export default Login;

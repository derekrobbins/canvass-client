import Ui from 'js/ui/ui';
import Globals from 'js/globals';
import Settings from 'js/settings';
import Chat from 'js/chat';
import Users from 'js/users';
import Host from 'js/host';

let Login = {};

function onLoginSubmit(e) {
    let username = Ui.Login.getUserName();
    let password = Ui.Login.getPassword();
    e.preventDefault();
    if(!username || !password) {
        Ui.displayError(Globals.Errors.messages.enterUserName);
        return;
    }
    if(!Settings.get(Globals.Settings.host)) {
        let user = Users.add({name: username, host: new Host('noauth')});
        Users.setActiveUser(user.getKey());
        Ui.pageManager.goToPage(Globals.Pages.chat);
        Chat.init();
    }
    Ui.hideError();
}

Login.init = function() {
    Ui.Login.init(onLoginSubmit);
};

export default Login;

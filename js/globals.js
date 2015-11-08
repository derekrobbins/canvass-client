let Globals = {
    // Pages
    Pages: {
        login: 'login',
        settings: 'settings',
        chat: 'chat'
    },
    windowTemplateSelector: '#window-template',
    windowContainerSelector: '#windows',

    Settings: {
        host: 'host'
    },

    Errors: {
        messages: {
            enterUserName: 'Please enter a user name and password'
        },
        locations: {
            global: '#global-error'
        }
    },

    // UI Login selectors
    Login: {
        form: '#login form'
    }
};
Globals.directionClasses = Globals.topClass + ' ' + Globals.bottomClass + ' ' + Globals.leftClass + ' ' + Globals.rightClass;
export default Globals;

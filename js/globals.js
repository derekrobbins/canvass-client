let Globals = {
    // Pages
    Pages: {
        login: 'login',
        settings: 'settings',
        chat: 'chat'
    },
    windowTemplateSelector: '#window-template',
    windowContainerSelector: '#windows',

    // UI Login selectors
    Login: {
        form: '#login form'
    },
};
Globals.directionClasses = Globals.topClass + ' ' + Globals.bottomClass + ' ' + Globals.leftClass + ' ' + Globals.rightClass;
export default Globals;

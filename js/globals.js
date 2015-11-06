let Globals = {
    // UI generic classes and selectors
    pageSelector: '.page',
    gotoSelector: '.goto',
    goBackSelector: '.goback',
    topClass: 'top',
    bottomClass: 'bottom',
    leftClass: 'left',
    rightClass: 'right',
    activeClass: 'active',
    mainWindow: '#main',

    // UI Login selectors
    Login: {
        form: '#login form'
    },
};
Globals.directionClasses = Globals.topClass + ' ' + Globals.bottomClass + ' ' + Globals.leftClass + ' ' + Globals.rightClass;
export default Globals;

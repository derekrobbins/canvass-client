let Settings = {};
let settings = {
    host: {
        settable: true,
        value: ''
    }
};

Settings.init = () => {

};

Settings.get = (key) => {
    return settings[key].value;
};

Settings.set = (key, value) => {
    if(settings[key].settable) {
        settings[key].value = value;
    }
};

export default Settings;

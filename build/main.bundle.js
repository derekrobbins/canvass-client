"format global";
(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  var getOwnPropertyDescriptor = true;
  try {
    Object.getOwnPropertyDescriptor({ a: 0 }, 'a');
  }
  catch(e) {
    getOwnPropertyDescriptor = false;
  }

  var defineProperty;
  (function () {
    try {
      if (!!Object.defineProperty({}, 'a', {}))
        defineProperty = Object.defineProperty;
    }
    catch (e) {
      defineProperty = function(obj, prop, opt) {
        try {
          obj[prop] = opt.value || opt.get.call(obj);
        }
        catch(e) {}
      }
    }
  })();

  function register(name, deps, declare) {
    if (arguments.length === 4)
      return registerDynamic.apply(this, arguments);
    doRegister(name, {
      declarative: true,
      deps: deps,
      declare: declare
    });
  }

  function registerDynamic(name, deps, executingRequire, execute) {
    doRegister(name, {
      declarative: false,
      deps: deps,
      executingRequire: executingRequire,
      execute: execute
    });
  }

  function doRegister(name, entry) {
    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry;

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }


  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;

      if (typeof name == 'object') {
        for (var p in name)
          exports[p] = name[p];
      }
      else {
        exports[name] = value;
      }

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          for (var j = 0; j < importerModule.dependencies.length; ++j) {
            if (importerModule.dependencies[j] === module) {
              importerModule.setters[j](exports);
            }
          }
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        depExports = depEntry.esModule;
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;

    // create the esModule object, which allows ES6 named imports of dynamics
    exports = module.exports;
 
    if (exports && exports.__esModule) {
      entry.esModule = exports;
    }
    else {
      entry.esModule = {};
      
      // don't trigger getters/setters in environments that support them
      if ((typeof exports == 'object' || typeof exports == 'function') && exports !== global) {
        if (getOwnPropertyDescriptor) {
          var d;
          for (var p in exports)
            if (d = Object.getOwnPropertyDescriptor(exports, p))
              defineProperty(entry.esModule, p, d);
        }
        else {
          var hasOwnProperty = exports && exports.hasOwnProperty;
          for (var p in exports) {
            if (!hasOwnProperty || exports.hasOwnProperty(p))
              entry.esModule[p] = exports[p];
          }
         }
       }
      entry.esModule['default'] = exports;
      defineProperty(entry.esModule, '__useDefault', {
        value: true
      });
    }
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    // node core modules
    if (name.substr(0, 6) == '@node/')
      return require(name.substr(6));

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    // exported modules get __esModule defined for interop
    if (entry.declarative)
      defineProperty(entry.module.exports, '__esModule', { value: true });

    // return the defined module object
    return modules[name] = entry.declarative ? entry.module.exports : entry.esModule;
  };

  return function(mains, depNames, declare) {
    return function(formatDetect) {
      formatDetect(function(deps) {
        var System = {
          _nodeRequire: typeof require != 'undefined' && require.resolve && typeof process != 'undefined' && require,
          register: register,
          registerDynamic: registerDynamic,
          get: load, 
          set: function(name, module) {
            modules[name] = module; 
          },
          newModule: function(module) {
            return module;
          }
        };
        System.set('@empty', {});

        // register external dependencies
        for (var i = 0; i < depNames.length; i++) (function(depName, dep) {
          if (dep && dep.__esModule)
            System.register(depName, [], function(_export) {
              return {
                setters: [],
                execute: function() {
                  for (var p in dep)
                    if (p != '__esModule' && !(typeof p == 'object' && p + '' == 'Module'))
                      _export(p, dep[p]);
                }
              };
            });
          else
            System.registerDynamic(depName, [], false, function() {
              return dep;
            });
        })(depNames[i], arguments[i]);

        // register modules in this bundle
        declare(System);

        // load mains
        var firstLoad = load(mains[0]);
        if (mains.length > 1)
          for (var i = 1; i < mains.length; i++)
            load(mains[i]);

        if (firstLoad.__useDefault)
          return firstLoad['default'];
        else
          return firstLoad;
      });
    };
  };

})(typeof self != 'undefined' ? self : global)
/* (['mainModule'], ['external-dep'], function($__System) {
  System.register(...);
})
(function(factory) {
  if (typeof define && define.amd)
    define(['external-dep'], factory);
  // etc UMD / module pattern
})*/

(['1'], [], function($__System) {

$__System.register("2", ["3", "4"], function (_export) {
    var _createClass, _classCallCheck, hosts, Host;

    return {
        setters: [function (_) {
            _createClass = _["default"];
        }, function (_2) {
            _classCallCheck = _2["default"];
        }],
        execute: function () {
            "use strict";

            hosts = {};

            Host = (function () {
                /*
                 *  address: string
                 */

                function Host(address) {
                    _classCallCheck(this, Host);

                    if (hosts[address]) {
                        return hosts[address];
                    }
                    this.setAddress(address);
                    hosts[address] = this;
                    this._onMessageCallbacks = [];
                    return this;
                }

                /*
                 *  address: string
                 */

                _createClass(Host, [{
                    key: "setAddress",
                    value: function setAddress(address) {
                        this.address = address;
                    }
                }, {
                    key: "getAddress",
                    value: function getAddress() {
                        return this.address;
                    }

                    /*
                     *  message: {
                     *      user: User,
                     *      content: string,
                     *      room: string
                     *  }
                     */
                }, {
                    key: "submitMessage",
                    value: function submitMessage(message) {
                        // send message to server

                        // temporary until we get a server hooked up
                        message.timestamp = Date.now();
                        message.from = message.user.getName();
                        this.receivedMessage(message);
                    }

                    /*
                     *  message: {
                     *      user: User,
                     *      content: string,
                     *      room: string,
                     *      timestamp: int (unix timestamp)
                     *  }
                     */
                }, {
                    key: "receivedMessage",
                    value: function receivedMessage(message) {
                        this._onMessageCallbacks.forEach(function (item) {
                            item.cb.call(item.self, message);
                        });
                    }
                }, {
                    key: "onMessage",
                    value: function onMessage(cb, self) {
                        this._onMessageCallbacks.push({ cb: cb, self: self });
                    }
                }]);

                return Host;
            })();

            _export("default", Host);
        }
    };
});
$__System.register('5', [], function (_export) {
    'use strict';

    var Templates;
    return {
        setters: [],
        execute: function () {
            Templates = {
                chatWindow: {
                    messages: {
                        text: function text(message) {
                            var dt = new Date(message.timestamp);
                            var minutes = dt.getMinutes();
                            if (minutes < 10) {
                                minutes = '0' + minutes;
                            }
                            var time = dt.getHours() + ':' + minutes;
                            return '<li>\n                    <p class="time thin">' + time + '</p>\n                    <p class="name bold">' + message.from + '</p>\n                    <p class="content">' + message.content + '</p>\n                </li>';
                        }
                    }
                }
            };

            _export('default', Templates);
        }
    };
});
$__System.register("6", ["3", "4"], function (_export) {
    var _createClass, _classCallCheck, hosts, Host;

    return {
        setters: [function (_) {
            _createClass = _["default"];
        }, function (_2) {
            _classCallCheck = _2["default"];
        }],
        execute: function () {
            "use strict";

            hosts = {};

            Host = (function () {
                /*
                 *  address: string
                 */

                function Host(address) {
                    _classCallCheck(this, Host);

                    if (hosts[address]) {
                        return hosts[address];
                    }
                    this.setAddress(address);
                    hosts[address] = this;
                    this._onMessageCallbacks = [];
                    return this;
                }

                /*
                 *  address: string
                 */

                _createClass(Host, [{
                    key: "setAddress",
                    value: function setAddress(address) {
                        this.address = address;
                    }
                }, {
                    key: "getAddress",
                    value: function getAddress() {
                        return this.address;
                    }

                    /*
                     *  message: {
                     *      user: User,
                     *      content: string,
                     *      room: string
                     *  }
                     */
                }, {
                    key: "submitMessage",
                    value: function submitMessage(message) {
                        // send message to server

                        // temporary until we get a server hooked up
                        message.timestamp = Date.now();
                        message.from = message.user.getName();
                        this.receivedMessage(message);
                    }

                    /*
                     *  message: {
                     *      user: User,
                     *      content: string,
                     *      room: string,
                     *      timestamp: int (unix timestamp)
                     *  }
                     */
                }, {
                    key: "receivedMessage",
                    value: function receivedMessage(message) {
                        this._onMessageCallbacks.forEach(function (item) {
                            item.cb.call(item.self, message);
                        });
                    }
                }, {
                    key: "onMessage",
                    value: function onMessage(cb, self) {
                        this._onMessageCallbacks.push({ cb: cb, self: self });
                    }
                }]);

                return Host;
            })();

            _export("default", Host);
        }
    };
});
$__System.register('7', ['3', '4', '6', '8', '9'], function (_export) {
    var _createClass, _classCallCheck, Host, ChatRoom, _Object$keys, Users, users, activeKey, User;

    /*
     *  name: string
     *  host: string
     */
    function generateUserKey(name, host) {
        return host + name;
    }return {
        setters: [function (_) {
            _createClass = _['default'];
        }, function (_2) {
            _classCallCheck = _2['default'];
        }, function (_5) {
            Host = _5['default'];
        }, function (_4) {
            ChatRoom = _4['default'];
        }, function (_3) {
            _Object$keys = _3['default'];
        }],
        execute: function () {
            'use strict';

            Users = {};
            users = {};
            activeKey = '';

            User = (function () {

                /*
                 *  options: {
                 *      name: String
                 *      host: Host
                 *  }
                 */

                function User(options) {
                    _classCallCheck(this, User);

                    this.name = options.name;
                    this.setHost(new Host(options.host));
                    this.userKey = generateUserKey(options.name, options.host.getAddress());
                    this.initRooms();
                }

                _createClass(User, [{
                    key: 'getName',
                    value: function getName() {
                        return this.name;
                    }
                }, {
                    key: 'getKey',
                    value: function getKey() {
                        return this.userKey;
                    }
                }, {
                    key: 'getHost',
                    value: function getHost() {
                        return this.host;
                    }

                    /*
                     *  host: Host
                     */
                }, {
                    key: 'setHost',
                    value: function setHost(host) {
                        this.host = host;
                    }
                }, {
                    key: 'initRooms',
                    value: function initRooms() {
                        var _this = this;

                        var rooms = {
                            'public': [{
                                name: 'General',
                                members: ['notRealGuy']
                            }]
                        };
                        this.rooms = {};
                        _Object$keys(rooms).forEach(function (key) {
                            var type = rooms[key];
                            _this.rooms[key] = [];
                            type.forEach(function (room) {
                                var thisRoom = new ChatRoom({ user: _this, name: room.name });
                                _this.rooms[key].push(thisRoom);
                                thisRoom.addMembers(room.members);
                            });
                        });
                    }
                }, {
                    key: 'getRooms',
                    value: function getRooms() {}
                }]);

                return User;
            })();

            ;

            Users.add = function (options) {
                var user = new User(options);
                users[user.getKey()] = user;
                return user;
            };

            Users.setActiveUser = function (key) {
                activeKey = key;
            };

            Users.getActiveUser = function () {
                return users[activeKey];
            };

            _export('default', Users);
        }
    };
});
$__System.register('a', ['3', '4', '5', '7', 'b'], function (_export) {
    var _createClass, _classCallCheck, Templates, Users, Globals, ChatRoomUi;

    return {
        setters: [function (_) {
            _createClass = _['default'];
        }, function (_2) {
            _classCallCheck = _2['default'];
        }, function (_4) {
            Templates = _4['default'];
        }, function (_3) {
            Users = _3['default'];
        }, function (_b) {
            Globals = _b['default'];
        }],
        execute: function () {
            'use strict';

            ChatRoomUi = (function () {

                /*
                 *  chatRoom: ChatRoom
                 */

                function ChatRoomUi(chatRoom) {
                    _classCallCheck(this, ChatRoomUi);

                    this.setChatRoom(chatRoom);
                    this.renderWindow();
                    this.$form = this.$window.find('form');
                    this.$form.submit(this.submitMessage.bind(this));
                    return this;
                }

                _createClass(ChatRoomUi, [{
                    key: 'getHost',
                    value: function getHost() {
                        return this.getChatRoom().getHost();
                    }
                }, {
                    key: 'renderWindow',
                    value: function renderWindow() {
                        this.$window = $($(Globals.windowTemplateSelector).html());
                        $(Globals.windowContainerSelector).append(this.$window);
                    }

                    /*
                     *  message: string
                     */
                }, {
                    key: 'getMessageObj',
                    value: function getMessageObj(message) {
                        return {
                            user: this.getChatRoom().getUser(),
                            room: this.getChatRoom().getName(),
                            content: message
                        };
                    }
                }, {
                    key: 'getChatRoom',
                    value: function getChatRoom() {
                        return this.chatRoom;
                    }

                    /*
                     *  chatRoom: ChatRoom
                     */
                }, {
                    key: 'setChatRoom',
                    value: function setChatRoom(chatRoom) {
                        this.chatRoom = chatRoom;
                    }

                    /*
                     *  message: {
                     *      timestamp: int (unix timestamp)
                     *      from: string
                     *      content: string
                     *  }
                     */
                }, {
                    key: 'addMessageToChat',
                    value: function addMessageToChat(message) {
                        var html = Templates.chatWindow.messages.text(message);
                        this.$window.find('.conversation-window').append(html);
                    }

                    /*
                     *  e: form submit event
                     */
                }, {
                    key: 'submitMessage',
                    value: function submitMessage(e) {
                        e.preventDefault();
                        var content = $(this.$form.get(0).elements.input).val();
                        $(this.$form.get(0).elements.input).val('');
                        this.getHost().submitMessage(this.getMessageObj(content));
                    }
                }]);

                return ChatRoomUi;
            })();

            _export('default', ChatRoomUi);
        }
    };
});
$__System.register('8', ['3', '4', 'a'], function (_export) {
    var _createClass, _classCallCheck, ChatRoomUi, ChatRoom;

    return {
        setters: [function (_) {
            _createClass = _['default'];
        }, function (_2) {
            _classCallCheck = _2['default'];
        }, function (_a) {
            ChatRoomUi = _a['default'];
        }],
        execute: function () {
            'use strict';

            ChatRoom = (function () {

                /*
                 *  options: {
                 *      name: String
                 *      user: User
                 *  }
                 */

                function ChatRoom(options) {
                    _classCallCheck(this, ChatRoom);

                    this.setName(options.name);
                    this.setUser(options.user);
                    this.setUi(new ChatRoomUi(this));
                    this.getHost().onMessage(this.addMessageToChat, this);
                    return this;
                }

                /*
                 *  content: String
                 */

                _createClass(ChatRoom, [{
                    key: 'addMessageToChat',
                    value: function addMessageToChat(content) {
                        this.ui.addMessageToChat(content);
                    }

                    /*
                     *  members: string[]
                     */
                }, {
                    key: 'addMembers',
                    value: function addMembers(members) {}
                }, {
                    key: 'getHost',
                    value: function getHost() {
                        return this.getUser().getHost();
                    }
                }, {
                    key: 'getName',
                    value: function getName() {
                        return this.name;
                    }

                    /*
                     *  name: string
                     */
                }, {
                    key: 'setName',
                    value: function setName(name) {
                        return this.name = name;
                    }
                }, {
                    key: 'getUi',
                    value: function getUi() {
                        return this.ui;
                    }

                    /*
                     *  ui: ChatRoomUi
                     */
                }, {
                    key: 'setUi',
                    value: function setUi(ui) {
                        this.ui = ui;
                    }
                }, {
                    key: 'getUser',
                    value: function getUser() {
                        return this.user;
                    }

                    /*
                     *  user: User
                     */
                }, {
                    key: 'setUser',
                    value: function setUser(user) {
                        this.user = user;
                    }
                }]);

                return ChatRoom;
            })();

            _export('default', ChatRoom);
        }
    };
});
$__System.register('c', ['7', '8'], function (_export) {
  'use strict';

  var Users, ChatRoom, Chat;
  return {
    setters: [function (_2) {
      Users = _2['default'];
    }, function (_) {
      ChatRoom = _['default'];
    }],
    execute: function () {
      Chat = {};

      Chat.init = function () {};

      _export('default', Chat);
    }
  };
});
$__System.register('d', [], function (_export) {
    'use strict';

    var Settings, settings;
    return {
        setters: [],
        execute: function () {
            Settings = {};
            settings = {
                host: {
                    settable: true,
                    value: ''
                }
            };

            Settings.init = function () {};

            Settings.get = function (key) {
                return settings[key].value;
            };

            Settings.set = function (key, value) {
                if (settings[key].settable) {
                    settings[key].value = value;
                }
            };

            _export('default', Settings);
        }
    };
});
$__System.registerDynamic("e", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(exec) {
    try {
      return !!exec();
    } catch (e) {
      return true;
    }
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("f", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var core = module.exports = {version: '1.2.5'};
  if (typeof __e == 'number')
    __e = core;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("10", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
  if (typeof __g == 'number')
    __g = global;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("11", ["10", "f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = req('10'),
      core = req('f'),
      PROTOTYPE = 'prototype';
  var ctx = function(fn, that) {
    return function() {
      return fn.apply(that, arguments);
    };
  };
  var $def = function(type, name, source) {
    var key,
        own,
        out,
        exp,
        isGlobal = type & $def.G,
        isProto = type & $def.P,
        target = isGlobal ? global : type & $def.S ? global[name] : (global[name] || {})[PROTOTYPE],
        exports = isGlobal ? core : core[name] || (core[name] = {});
    if (isGlobal)
      source = name;
    for (key in source) {
      own = !(type & $def.F) && target && key in target;
      if (own && key in exports)
        continue;
      out = own ? target[key] : source[key];
      if (isGlobal && typeof target[key] != 'function')
        exp = source[key];
      else if (type & $def.B && own)
        exp = ctx(out, global);
      else if (type & $def.W && target[key] == out)
        !function(C) {
          exp = function(param) {
            return this instanceof C ? new C(param) : C(param);
          };
          exp[PROTOTYPE] = C[PROTOTYPE];
        }(out);
      else
        exp = isProto && typeof out == 'function' ? ctx(Function.call, out) : out;
      exports[key] = exp;
      if (isProto)
        (exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
    }
  };
  $def.F = 1;
  $def.G = 2;
  $def.S = 4;
  $def.P = 8;
  $def.B = 16;
  $def.W = 32;
  module.exports = $def;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("12", ["11", "f", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $def = req('11'),
      core = req('f'),
      fails = req('e');
  module.exports = function(KEY, exec) {
    var $def = req('11'),
        fn = (core.Object || {})[KEY] || Object[KEY],
        exp = {};
    exp[KEY] = exec(fn);
    $def($def.S + $def.F * fails(function() {
      fn(1);
    }), 'Object', exp);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("13", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(it) {
    if (it == undefined)
      throw TypeError("Can't call method on  " + it);
    return it;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("14", ["13"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var defined = req('13');
  module.exports = function(it) {
    return Object(defined(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("15", ["14", "12"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toObject = req('14');
  req('12')('keys', function($keys) {
    return function keys(it) {
      return $keys(toObject(it));
    };
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("16", ["15", "f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('15');
  module.exports = req('f').Object.keys;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("9", ["16"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('16'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  exports["default"] = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  exports.__esModule = true;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("17", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $Object = Object;
  module.exports = {
    create: $Object.create,
    getProto: $Object.getPrototypeOf,
    isEnum: {}.propertyIsEnumerable,
    getDesc: $Object.getOwnPropertyDescriptor,
    setDesc: $Object.defineProperty,
    setDescs: $Object.defineProperties,
    getKeys: $Object.keys,
    getNames: $Object.getOwnPropertyNames,
    getSymbols: $Object.getOwnPropertySymbols,
    each: [].forEach
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("18", ["17"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('17');
  module.exports = function defineProperty(it, key, desc) {
    return $.setDesc(it, key, desc);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("19", ["18"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('18'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3", ["19"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('19')["default"];
  exports["default"] = (function() {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor)
          descriptor.writable = true;
        _Object$defineProperty(target, descriptor.key, descriptor);
      }
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  exports.__esModule = true;
  global.define = __define;
  return module.exports;
});

$__System.register('1a', ['3', '4', '9'], function (_export) {
    var _createClass, _classCallCheck, _Object$keys, Page, PageManager;

    return {
        setters: [function (_) {
            _createClass = _['default'];
        }, function (_2) {
            _classCallCheck = _2['default'];
        }, function (_3) {
            _Object$keys = _3['default'];
        }],
        execute: function () {
            'use strict';

            Page = (function () {
                function Page(pageEl) {
                    _classCallCheck(this, Page);

                    this.$element = $(pageEl);
                    this.name = this.$element.data('pmName');
                    return this;
                }

                _createClass(Page, [{
                    key: 'hide',
                    value: function hide() {
                        this.$element.removeClass('pm-show');
                    }
                }, {
                    key: 'show',
                    value: function show() {
                        this.$element.addClass('pm-show');
                    }
                }]);

                return Page;
            })();

            PageManager = (function () {
                function PageManager() {
                    var options = arguments.length <= 0 || arguments[0] === undefined ? { pageClass: 'pm-page', goToClass: 'pm-goto', goBackClass: 'pm-go-back' } : arguments[0];

                    _classCallCheck(this, PageManager);

                    this.options = options;
                    this.pages = {};
                    this.history = [];
                    this.setUpListeners();
                    [].slice.call(document.getElementsByClassName(options.pageClass)).forEach(this.createPage, this);
                    return this;
                }

                _createClass(PageManager, [{
                    key: 'createPage',
                    value: function createPage(pageEl) {
                        var page = new Page(pageEl);
                        this.pages[page.name] = page;
                    }
                }, {
                    key: 'goToPage',
                    value: function goToPage(identifier, transition) {
                        var _this = this;

                        this.history.push(identifier);
                        _Object$keys(this.pages).forEach(function (page) {
                            _this.pages[page].hide();
                        });
                        this.pages[identifier].show();
                    }
                }, {
                    key: 'goBack',
                    value: function goBack() {
                        this.history.pop();
                        this.goToPage(this.history[this.history.length - 1]);
                    }
                }, {
                    key: 'setUpListeners',
                    value: function setUpListeners() {
                        var _this2 = this;

                        $('body').on('click', '.' + this.options.goToClass, function (e) {
                            var element = $(e.currentTarget);
                            var data = element.data();
                            var destination = data.pmGoto;
                            e.preventDefault();
                            _this2.goToPage(data.pmGoto);
                        });
                        $('body').on('click', '.' + this.options.goBackClass, function (e) {
                            e.preventDefault();
                            _this2.goBack();
                        });
                    }
                }]);

                return PageManager;
            })();

            _export('default', PageManager);
        }
    };
});
$__System.register('b', [], function (_export) {
    'use strict';

    var Globals;
    return {
        setters: [],
        execute: function () {
            Globals = {
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

            _export('default', Globals);
        }
    };
});
$__System.register('1b', ['b', '1a'], function (_export) {
    'use strict';

    var Globals, PageManager, globalError, Ui;
    return {
        setters: [function (_b) {
            Globals = _b['default'];
        }, function (_a) {
            PageManager = _a['default'];
        }],
        execute: function () {
            globalError = $(Globals.Errors.locations.global);
            Ui = {
                Login: {}
            };

            Ui.init = function () {
                Ui.pageManager = new PageManager();
                Ui.pageManager.goToPage(Globals.Pages.login);
            };

            Ui.displayError = function (message) {
                var location = arguments.length <= 1 || arguments[1] === undefined ? globalError : arguments[1];

                location.html(message).show();
            };

            Ui.hideError = function () {
                var location = arguments.length <= 0 || arguments[0] === undefined ? globalError : arguments[0];

                location.html('').hide();
            };

            Ui.Login.init = function (onSubmit) {
                $(Globals.Login.form).submit(onSubmit);
            };

            Ui.Login.getUserName = function () {
                return $(Globals.Login.form).get(0).elements.user.value;
            };

            Ui.Login.getPassword = function () {
                return $(Globals.Login.form).get(0).elements.password.value;
            };

            _export('default', Ui);
        }
    };
});
$__System.register('1c', ['2', '7', '1b', 'b', 'd', 'c'], function (_export) {
    'use strict';

    var Host, Users, Ui, Globals, Settings, Chat, Login;

    function onLoginSubmit(e) {
        var username = Ui.Login.getUserName();
        var password = Ui.Login.getPassword();
        e.preventDefault();
        if (!username || !password) {
            Ui.displayError(Globals.Errors.messages.enterUserName);
            return;
        }
        if (!Settings.get(Globals.Settings.host)) {
            var user = Users.add({ name: username, host: new Host('noauth') });
            Users.setActiveUser(user.getKey());
            Ui.pageManager.goToPage(Globals.Pages.chat);
            Chat.init();
        }
        Ui.hideError();
    }

    return {
        setters: [function (_2) {
            Host = _2['default'];
        }, function (_) {
            Users = _['default'];
        }, function (_b) {
            Ui = _b['default'];
        }, function (_b2) {
            Globals = _b2['default'];
        }, function (_d) {
            Settings = _d['default'];
        }, function (_c) {
            Chat = _c['default'];
        }],
        execute: function () {
            Login = {};
            Login.init = function () {
                Ui.Login.init(onLoginSubmit);
            };

            _export('default', Login);
        }
    };
});
$__System.register('1', ['1c', '1b', 'd', 'b'], function (_export) {
    'use strict';

    var Login, Ui, Settings, Globals;
    return {
        setters: [function (_c) {
            Login = _c['default'];
        }, function (_b) {
            Ui = _b['default'];
        }, function (_d) {
            Settings = _d['default'];
        }, function (_b2) {
            Globals = _b2['default'];
        }],
        execute: function () {

            (function () {
                Ui.init();
                Login.init();
                Settings.init();
            })();
        }
    };
});
})
(function(factory) {
  factory();
});
//# sourceMappingURL=main.bundle.js.map

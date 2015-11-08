import ChatRoom from 'js/chatroom';
import Host from 'js/Host';

let Users = {};
let users = {};
let activeKey = '';

class User {

    /*
     *  options: {
     *      name: String
     *      host: Host
     *  }
     */
    constructor(options) {
        this.name = options.name;
        this.setHost(new Host(options.host));
        this.userKey = generateUserKey(options.name, options.host.getAddress());
        this.initRooms();
    }
    getName() {
        return this.name;
    }
    getKey() {
        return this.userKey;
    }
    getHost() {
        return this.host;
    }

    /*
     *  host: Host
     */
    setHost(host) {
        this.host = host;
    }
    initRooms() {
        let rooms = {
            public: [
                {
                    name: 'General',
                    members: ['notRealGuy']
                }
            ]
        };
        this.rooms = {};
        Object.keys(rooms).forEach((key) => {
            let type = rooms[key];
            this.rooms[key] = [];
            type.forEach((room) => {
                let thisRoom = new ChatRoom({user: this, name: room.name});
                this.rooms[key].push(thisRoom);
                thisRoom.addMembers(room.members);
            });
        });
    }
    getRooms() {

    }
}

/*
 *  name: string
 *  host: string
 */
function generateUserKey(name, host) {
    return host + name;
};

Users.add = (options) => {
    let user = new User(options);
    users[user.getKey()] = user;
    return user;
};

Users.setActiveUser = (key) => {
    activeKey = key;
};

Users.getActiveUser = () => {
    return users[activeKey];
};

export default Users;

import ChatRoom from 'js/chatroom';
import Host from 'js/host';
import Member from 'js/member';

let Users = {};
let users = {};
let activeKey = '';

class User extends Member{

    /*
     *  options: {
     *      handle: string,
     *      host: Host,
     *      userKey: string
     *  }
     */
    constructor(options) {
        super(options);
        this.initRooms();
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

Users.add = (options) => {
    let user = new User(options);
    users[user.getMemberKey()] = user;
    return user;
};

Users.setActiveUser = (key) => {
    activeKey = key;
};

Users.getActiveUser = () => {
    return users[activeKey];
};

export default Users;

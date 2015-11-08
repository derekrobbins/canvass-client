import ChatRoomUi from 'js/ui/ui.chatroom';

class ChatRoom {

    /*
     *  options: {
     *      name: String
     *      user: User
     *  }
     */
    constructor(options) {
        this.setName(options.name);
        this.setUser(options.user);
        this.setUi(new ChatRoomUi(this));
        this.getHost().onMessage(this.addMessageToChat, this);
        return this;
    }

    /*
     *  content: String
     */
    addMessageToChat(content) {
        this.ui.addMessageToChat(content);
    }

    /*
     *  members: string[]
     */
    addMembers(members) {

    }

    getHost() {
        return this.getUser().getHost();
    }

    getName() {
        return this.name;
    }

    /*
     *  name: string
     */
    setName(name) {
        return this.name = name;
    }
    getUi() {
        return this.ui;
    }


    /*
     *  ui: ChatRoomUi
     */
    setUi(ui) {
        this.ui = ui;
    }

    getUser() {
        return this.user;
    }

    /*
     *  user: User
     */
    setUser(user) {
        this.user = user;
    }
}

export default ChatRoom;

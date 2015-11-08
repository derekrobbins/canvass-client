import Globals from 'js/globals';
import Users from 'js/users';
import Templates from 'js/templates';

class ChatRoomUi {

    /*
     *  chatRoom: ChatRoom
     */
    constructor(chatRoom) {
        this.setChatRoom(chatRoom);
        this.renderWindow();
        this.$form = this.$window.find('form');
        this.$form.submit(this.submitMessage.bind(this));
        return this;
    }
    getHost() {
        return this.getChatRoom().getHost();
    }
    renderWindow() {
        this.$window = $($(Globals.windowTemplateSelector).html());
        $(Globals.windowContainerSelector).append(this.$window);
    }

    /*
     *  message: string
     */
    getMessageObj(message) {
        return {
            user: this.getChatRoom().getUser(),
            room: this.getChatRoom().getName(),
            content: message
        };
    }
    getChatRoom() {
        return this.chatRoom;
    }

    /*
     *  chatRoom: ChatRoom
     */
    setChatRoom(chatRoom) {
        this.chatRoom = chatRoom;
    }

    /*
     *  message: {
     *      timestamp: int (unix timestamp)
     *      from: string
     *      content: string
     *  }
     */
    addMessageToChat(message) {
        let html = Templates.chatWindow.messages.text(message)
        this.$window.find('.conversation-window').append(html);
    }

    /*
     *  e: form submit event
     */
    submitMessage(e) {
        e.preventDefault();
        let content = $(this.$form.get(0).elements.input).val();
        $(this.$form.get(0).elements.input).val('');
        this.getHost().submitMessage(this.getMessageObj(content));
    }
}

export default ChatRoomUi;

import Globals from 'js/globals';
import Templates from 'js/templates';

class ChatWindow {
    constructor(name) {
        this.renderWindow();
        this.$form = this.$window.find('form');
        this.$form.submit(this.submitMessage.bind(this));
        return this;
    }
    renderWindow() {
        this.$window = $($(Globals.windowTemplateSelector).html());
        $(Globals.windowContainerSelector).append(this.$window);
    }
    hide() {

    }
    show() {

    }
    submitMessage(e) {
        e.preventDefault();
        let content = $(this.$form.get(0).elements.input).val();
        let timestamp = Date.now();
        let name = 'Derek';
        let message = {
            from: name,
            timestamp: timestamp,
            content: content
        };
        $(this.$form.get(0).elements.input).val('');
        this.addMessageToChat(Templates.chatWindow.messages.text(message));
    }
    addMessageToChat(message) {
        this.$window.find('.conversation-window').append(message);
    }
}

export default ChatWindow;

import Member from 'js/member';

let Templates = {
    chatWindow: {
        messages: {
            text: function(message) {
                let dt = new Date(message.timestamp);
                let minutes = dt.getMinutes();
                let member = Member.getMember(message.from);
                if(minutes < 10) {
                    minutes = '0' + minutes;
                }
                let time = dt.getHours() + ':' + minutes;
                return `<li data-user-key="${member.getMemberKey()}">
                    <p class="time thin">${time}</p>
                    <p class="name bold">${member.getHandle()}</p>
                    <p class="content">${message.content}</p>
                </li>`;
            }
        }
    }
};

export default Templates;

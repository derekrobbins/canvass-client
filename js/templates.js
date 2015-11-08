let Templates = {
    chatWindow: {
        messages: {
            text: function(message) {
                let dt = new Date(message.timestamp);
                let minutes = dt.getMinutes();
                if(minutes < 10) {
                    minutes = '0' + minutes;
                }
                let time = dt.getHours() + ':' + minutes;
                return `<li>
                    <p class="time thin">${time}</p>
                    <p class="name bold">${message.from}</p>
                    <p class="content">${message.content}</p>
                </li>`;
            }
        }
    }
};

export default Templates;

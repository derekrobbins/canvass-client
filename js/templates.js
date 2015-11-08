let Templates = {
    chatWindow: {
        messages: {
            text: function(message) {
                let dt = new Date(message.timestamp);
                let time = dt.getHours() + ':' + dt.getMinutes();
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

let hosts = {};

class Host {
    /*
     *  address: string
     */
    constructor(address) {
        if(hosts[address]) {
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
    setAddress(address) {
        this.address = address;
    }
    getAddress() {
        return this.address;
    }

    /*
     *  message: {
     *      user: User,
     *      content: string,
     *      room: string
     *  }
     */
    submitMessage(message) {
        // send message to server

        // temporary until we get a server hooked up
        message.timestamp = Date.now();
        message.from = message.user.getMemberKey();
        this.receivedMessage(message);
    }

    /*
     *  message: {
     *      from: string, (member key)
     *      content: string,
     *      room: string,
     *      timestamp: int (unix timestamp)
     *  }
     */
    receivedMessage(message) {
        this._onMessageCallbacks.forEach((item) => {
            item.cb.call(item.self, message);
        });
    }

    onMessage(cb, self) {
        this._onMessageCallbacks.push({cb: cb, self: self});
    }
}

export default Host;

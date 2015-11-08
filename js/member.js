import Host from 'js/host';

let members = [];

class Member {

    /*
     *  options: {
     *      handle: string,
     *      host: Host,
     *      memberKey: string
     *  }
     */
    constructor(options) {
        this.setHandle(options.handle);
        this.setHost(new Host(options.host));
        this.setMemberKey(options.memberKey);
        members[this.getMemberKey()] = this;
        return this;
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
    getHandle() {
        return this.handle;
    }
    setHandle(handle) {
        this.handle = handle;
    }
    getMemberKey() {
        return this.userKey;
    }
    setMemberKey(key) {
        this.userKey = key;
    }
    static getMember(key) {
        return members[key];
    }
}

export default Member;

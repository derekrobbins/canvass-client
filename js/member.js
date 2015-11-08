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
        this.setName(options.name);
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
        return this.handle || this.name;
    }
    setHandle(handle) {
        this.handle = handle;
    }
    getName() {
        return this.name;
    }
    setName(name) {
        this.name = name;
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

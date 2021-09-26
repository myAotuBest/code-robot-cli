/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-07-01 22:35:11
 * @LastEditors: Roy
 * @LastEditTime: 2021-07-06 22:44:30
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/models/git/lib/GitServer.js
 */
function error(methodName) {
    throw new Error(`${methodName}必须实现`);
}
class GitServer {
    //type:git类型
    constructor(type, token) {
        this.type = type;
        this.token = token;
    }
    setToken(token) {
        this.token = token;
    }
    //创建远程仓库
    createRepo(name) {
        error('createRepo');
    }
    //创建组织
    createOrgRepo(name, login) {
        error('createOrgRepo');
    }
    getRemote() {
        error('getRemote');
    }
    getUser() {
        error('getUser');
    }
    getOrg() {
        error('getOrg');
    }
    getRepo(login, name) {
        error('getRepo');
    }
    getTokenUrl() {
        error('getSSHKeyUrl');
    }
    getTokenHelpUrl() {
        error('getTokenHelpUrl');
    }
    isHttpResponse = (response) => {
        return response && response.status;
    };

    handleResponse = (response) => {
        if (this.isHttpResponse(response) && response !== 200) {
            return null;
        } else {
            return response;
        }
    };
}

module.exports = GitServer;
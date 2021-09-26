/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-07-01 22:48:26
 * @LastEditors: Roy
 * @LastEditTime: 2021-07-07 22:22:35
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/models/git/lib/Gitee.js
 */
const GitServer = require('./GitServer');
const GiteeRequest = require('./GiteeRequest');
class Gitee extends GitServer {
    constructor() {
        super('gitee');
        this.request = null;
    }
    setToken(token) {
        super.setToken(token);
        this.request = new GiteeRequest(token);
    }
    createRepo(name) {
        return this.request.post('/user/repos', {
            name,
        });
    }
    createOrgRepo(name, login) {
        return this.request.post(`/orgs/${login}/repos`, {
            name,
        });
    }
    getUser() {
        return this.request.get('/user');
    }
    getOrg(username) {
        return this.request.get(`/users/${username}/orgs`, {
            page: 1,
            per_page: 100,
        });
    }
    getRepo(login, name) {
        return this.request
            .get(`/repos/${login}/${name}`)
            .then(response => {
                return this.handleResponse(response);
            });
    }
    getTokenUrl() {
        return 'https://gitee.com/personal_access_tokens'
    }
    getTokenHelpUrl() {
        return 'https://gitee.com/help/articles/4191'
    }
    getRemote(name, login) {
        return `git@gitee.com:${login}/${name}.git`;
    }
}
module.exports = Gitee;
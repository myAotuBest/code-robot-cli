/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-07-01 22:47:00
 * @LastEditors: Roy
 * @LastEditTime: 2021-07-07 22:22:58
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/models/git/lib/Github.js
 */
const GitServer = require('./GitServer');
const GithubRequest = require('./GithubRequest')
class Github extends GitServer {
    constructor() {
        super('github');
        this.request = null;
    }
    setToken(token) {
        super.setToken(token);
        this.request = new GithubRequest(token);
    }
    createRepo(name) {
        return this.request.post('/user/repos', {
            name,
        }, {
            Accept: 'application/vnd.github.v3+json',
        });
    }

    createOrgRepo(name, login) {
        return this.request.post(`/orgs/${login}/repos`, {
            name,
        }, {
            Accept: 'application/vnd.github.v3+json',
        });
    }

    getUser() {
        return this.request.get('/user');
    }
    getOrg(username) {
        return this.request.get(`/user/orgs`, {
            page: 1,
            per_page: 100,
        });
    }
    getTokenUrl() {
        return 'https://github.com/settings/tokens';
    }
    getRepo(login, name) {
        return this.request
            .get(`/repos/${login}/${name}`)
            .then(response => {
                return this.handleResponse(response);
            });
    }

    getTokenHelpUrl() {
        return 'https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh';
    }

    getRemote(name, login) {
        return `git@github.com:${login}/${name}.git`;
    }
}
module.exports = Github;
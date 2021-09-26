/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-07-01 21:44:09
 * @LastEditors: Roy
 * @LastEditTime: 2021-09-07 22:07:41
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/models/git/__tests__/git.test.js
 */
'use strict';

const fs = require('fs');
const Git = require('../lib');
const Gitee = require('../lib/Gitee');
const GiteeRequest = require('../lib/GiteeRequest');
const should = require('should');


const GIT_TOKEN_PATH = '/Users/xucong/.roy-cli/.git/.git-token';

function createGiteeInstance() {
    const token = fs.readFileSync(GIT_TOKEN_PATH).toString();
    // const gitee = new Gitee();
    // gitee.setToken(token);
    return gitee;
}
describe('Gitee类实例化', () => {
    it('实例化检查', function () {
        const gitee = new Gitee();
        gitee.setToken('123456');
        gitee.type.should.equal('gitee');
        gitee.token.should.equal('123456');
        gitee.request.should.not.equal(null);
        gitee.request.__proto__.should.equal(GiteeRequest.prototype);
        console.log(createGiteeInstance());
    });
});

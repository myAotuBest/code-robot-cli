/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-03-08 10:04:27
 * @LastEditors: Roy
 * @LastEditTime: 2021-03-09 10:48:14
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/models/command/lib/index.js
 */
'use strict';

const semver = require('semver');
const colors = require('colors');
const log = require('@code-robot-cli/log');


const LOWEST_NODE_VERSION = '12.0.0';

class Command {
    constructor(argv) {
        // console.log('Command constructor',argv);
        if (!argv) {
            throw new Error('参数不能为空');
        }
        if (!Array.isArray(argv)) {
            throw new Error('参数必须为数组');
        }
        if (argv.length < 1) {
            throw new Error('参数列表不能为空');
        }
        this._argv = argv;
        let runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve();
            chain = chain.then(() => this.checkNodeVersion());
            chain = chain.then(() => this.initArgs());
            chain = chain.then(() => this.init());
            chain = chain.then(() => this.exec());
            chain.catch(err => {
                log.error(err.message);
            })
        })

    }
    init() {
        throw new Error('init必须实现');
    }
    exec() {
        throw new Error('exec必须实现');
    }
    initArgs() {
        this._cmd = this._argv[this._argv.length - 1];
        this._argv = this._argv.slice(0, this._argv.length - 1);
    }
    // 检查node版本
    checkNodeVersion() {
        //第一步，获取当前Node版本号
        const currentVersion = process.version;
        const lastVersion = LOWEST_NODE_VERSION;
        //第二步，对比最低版本号
        if (!semver.gte(currentVersion, lastVersion)) {
            throw new Error(colors.red(`roy-cli-dev 需要安装v${lastVersion}以上版本的Node.js`));
        }
    }
}

module.exports = Command;


'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Command = require('@code-robot-cli/command');
const Git = require('@code-robot-cli/git');
const log = require('@code-robot-cli/log');

class PublishCommand extends Command {
    init() {
        log.verbose('init', this._argv, this._cmd);
        this.options = {
            refreshServer: this._cmd.refreshServer,
            refreshToken: this._cmd.refreshToken,
            refreshOwner: this._cmd.refreshOwner,
            buildCmd: this._cmd.buildCmd,
            prod: this._cmd.prod,
            sshUser: this._cmd.sshUser,
            sshIp: this._cmd.sshIp,
            sshPath: this._cmd.sshPath,
        }
    }
    async exec() {
        try {
            const startTime = new Date().getTime();
            //初始化检查
            this.prepare();
            //Git Flow自动化
            const git = new Git(this.projectInfo, this.options);
            //自动化提交准备和代码仓库初始化
            await git.prepare()
            //代码自动化提交
            await git.commit();
            //云构建和云发布
            await git.publish();
            const endTime = new Date().getTime();
            log.info('本次发布耗时:' + Math.floor((endTime - startTime) / 1000) + '秒');
        } catch (e) {
            log.error(e.message);
            if (process.env.LOG_LEVEL === 'verbose') {
                console.log(e);
            }
        }
    }
    prepare() {
        //确认项目是否为npm项目
        const projectPath = process.cwd();
        const pkgPath = path.join(projectPath, 'package.json');
        log.verbose('package.json', pkgPath);
        if (!fs.existsSync(pkgPath)) {
            throw new Error('package.json不存在!');
        }

        //确认是否包含name,version,build命令
        const pkg = fse.readJSONSync(pkgPath);
        const { name, version, scripts } = pkg;
        log.verbose('package.json', name, version, scripts)
        if (!name || !version || !scripts || !scripts.build) {
            throw new Error('package.json信息不全，请检查是否存在name,version和scripts(需要提供build命令)')
        }
        this.projectInfo = { name, version, dir: projectPath };
    }
}

function init(argv) {
    return new PublishCommand(argv);
}

module.exports = init;
module.exports.PublishCommand = PublishCommand;

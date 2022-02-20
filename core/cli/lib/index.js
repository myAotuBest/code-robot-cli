/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-02-23 20:34:11
 * @LastEditors: Roy
 * @LastEditTime: 2022-02-12 17:45:57
 * @Deprecated: 否
 * @FilePath: /code-robot-cli/core/cli/lib/index.js
 */
'use strict';

module.exports = core;

const path = require('path');
const semver = require('semver');
const commander = require('commander');
const colors = require('colors');
const userHome = require('user-home');//获取当前用户主目录
const pathExists = require('path-exists').sync;//判断目录是否存在
const log = require('@code-robot-cli/log');
const init = require('@code-robot-cli/init');
const exec = require('@code-robot-cli/exec');



const pkg = require('../package.json');
const constants = require('./const');

let args;
const program = new commander.Command();

async function core() {
    try {
        await prepare();
        registerCommand();
    } catch (e) {
        log.error(e.message);
        if (process.env.LOG_LEVEL === 'verbose') {
            console.log(e);
        }
    }
}


async function prepare() {
    checkPkgVersion();
    checkRoot();
    checkUserHome();
    // checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();

}

//命名的注册
function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启调试模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '');

    program
        .command('init [projectName]')
        .option('-f, --force', '是否强制初始化项目')
        .action(exec);
    program
        .command('add [templateName]')
        .option('-n, --templateName', '复用代码名称')
        .action(exec);
    program
        .command('publish')
        .option('--refreshServer', '强制更新Git远程仓库')
        .option('--refreshToken', '强制更新远程仓库token')
        .option('--refreshOwner', '强制更新远程仓库类型')
        .option('--buildCmd <buildCmd>', '构建命令')
        .option('--prod', '是否正式发布')
        .option('--sshUser <sshUser>', '模板服务器用户名')
        .option('--sshIp <sshIp>', '模板服务器Ip或域名')
        .option('--sshPath <sshPath>', '模板服务器路径')
        .action(exec);

    //开启debug模式
    program.on('option:debug', function () {
        if (program.debug) {
            process.env.LOG_LEVEL = 'verbose';
        } else {
            process.env.LOG_LEVEL = 'info';
        }
        log.level = process.env.LOG_LEVEL;
        log.verbose('test');
    });

    //指定targetPath
    program.on('option:targetPath', function () {
        process.env.CLI_TARGET_PATH = program.targetPath;
    });

    //对未知命令的监听
    program.on('command:*', function (obj) {
        const availabelCommands = program.commands.map(cmd => cmd.name());
        log.verbose(colors.red('未知命令:' + obj[0]));
        if (availabelCommands.length > 0) {
            log.verbose(colors.blue('可用命令:' + availabelCommands.join(',')));
        }
    })

    program.parse(process.argv);
    //用户没有输入命令的时候
    if (program.args && program.args.length < 1) {
        program.outputHelp();
        console.log();
    }
}

// 检查是否是最新版本，是否需要更新
async function checkGlobalUpdate() {
    //1.获取当前版本号和模块名
    const currentVersion = pkg.version;
    const npmName = pkg.name;
    //2.调用npm API,获取所有版本号
    const { getNpmSemverVersion } = require('@code-robot-cli/get-cli-info');
    //3.提取所有版本号，比对哪些版本号是大于当前版本号
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        //4.获取最新的版本号，提示用户更新到该版本
        log.warn(colors.yellow(`请手动更新${npmName},当前版本:${currentVersion},最新版本:${lastVersion} 
                    更新命令:npm install -g ${npmName}`))
    }
}

// 检查环境变量
function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');
    if (pathExists(dotenvPath)) {
        config = dotenv.config({
            path: dotenvPath
        });
    }
    createDefaultConfig();
    log.verbose('环境变量', process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    }
    if (process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
    } else {
        cliConfig['cliHome'] = path.join(userHome, constants.DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// 检查入参
function checkInputArgs() {
    const minimist = require('minimist');
    args = minimist(process.argv.slice(2));
    checkArgs();
}

function checkArgs() {
    if (args.debug) {
        process.env.LOG_LEVEL = 'verbose';
    } else {
        process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
}
// 检查用户主目录
function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在!!!'));
    }
}
// 检查root启动
function checkRoot() {
    //使用后，检查到root账户启动，会进行降级为用户账户
    const rootCheck = require('root-check');
    rootCheck();
}


// 检查版本
function checkPkgVersion() {
    log.info('cli', pkg.version);
}



/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-03-04 15:53:52
 * @LastEditors: Roy
 * @LastEditTime: 2021-09-24 16:03:05
 * @Deprecated: 否
 * @FilePath: /code-robot-cli/commands/init/lib/index.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const userHome = require('user-home');
const inquirer = require('inquirer');
const ejs = require('ejs');
const glob = require('glob');
const semver = require('semver');
const Command = require('@code-robot-cli/command');
const log = require('@code-robot-cli/log');
const Package = require('@code-robot-cli/package');
const { spinnerStart, sleep, execAsync } = require('@code-robot-cli/utils');

const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';
const WHITE_COMMAND = ['npm', 'cnpm'];

const COMPONENT_FILE = '.componentrc';

class InitCommand extends Command {
    init() {
        this.projectName = this._argv[0] || '';
        this.force = this._cmd.force;
        log.verbose(this._argv);
        log.verbose('projectName', this.projectName);
        log.verbose('force', this.force);
    }
    async exec() {
        try {
            //1.准备阶段
            const projectInfo = await this.prepare();
            if (projectInfo) {
                //2.下载模板
                log.verbose('projectInfo', projectInfo);
                this.projectInfo = projectInfo
                await this.downloadTemplate();
                //3.安装模板
                await this.installTemplate();
            }
        } catch (e) {
            log.error(e.message);
            if (process.env.LOG_LEVEL === 'verbose') {
                console.log(e);
            }
        }
    }

    async installTemplate() {
        log.verbose('templateInfo', this.templateInfo);
        if (this.templateInfo) {
            if (!this.templateInfo.type) {
                this.templateInfo.type = TEMPLATE_TYPE_NORMAL
            }
            if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
                //标准安装   
                await this.installNormalTemplate();
            } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
                //自定义安装
                await this.installCustomTemplate();
            } else {
                throw new Error('无法失败项目模板类');
            }

        } else {
            throw new Error('项目模板信息不存在');
        }
    }
    checkCommand(cmd) {
        if (WHITE_COMMAND.includes(cmd)) {
            return cmd;
        }
        return null;
    }

    async execCommand(command, errMsg) {
        let ret;
        if (command) {
            const cmdArray = command.split(' ');
            const cmd = this.checkCommand(cmdArray[0]);
            if (!cmd) {
                throw new Error('命令不存在!命令:' + command);
            }
            const args = cmdArray.slice(1);
            ret = await execAsync(cmd, args, {
                stdio: 'inherit',
                cwd: process.cwd(),
            })
        }
        if (ret !== 0) {
            throw new Error(errMsg)
        }
    }

    async ejsRender(options) {
        const dir = process.cwd();
        const projectInfo = this.projectInfo;
        return new Promise((resolve, reject) => {
            glob('**', {
                cwd: dir,
                ignore: options.ignore || '',
                nodir: true,
            }, (err, files) => {
                if (err) {
                    reject(err);
                }
                Promise.all(files.map(file => {
                    const filePath = path.join(dir, file);
                    return new Promise((resolve1, reject1) => {
                        ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                            console.log(result);
                            if (err) {
                                reject1(err);
                            } else {
                                fse.writeFileSync(filePath, result);
                                resolve1(result);
                            }
                        })
                    });
                })).then(() => {
                    resolve();
                }).catch(err => {
                    reject(err);
                });
            })
        })
    }

    async installNormalTemplate() {
        //拷贝模板代码直当前目录
        let spinner = spinnerStart('正在安装模板');
        log.verbose('templateNpm', this.templateNpm)
        try {
            const templatePath = path.resolve(this.templateNpm.cachFilePath, 'template');
            const targetPath = process.cwd();
            fse.ensureDirSync(templatePath);//确保当前文件存不存在，不存在会创建
            fse.ensureDirSync(targetPath);
            fse.copySync(templatePath, targetPath);//把缓存目录下的模板拷贝到当前目录
        } catch (e) {
            throw e;
        } finally {
            spinner.stop(true);
            log.success('模板安装成功');
        }
        const templateIgnore = this.templateInfo.ignore || [];
        const ignore = ['**/node_modules/**', ...templateIgnore];
        await this.ejsRender({ ignore });
        //如果是组件，则生成组件配置文件
        await this.createComponentFile(targetPath);
        //依赖安装
        const { installCommand, startCommand } = this.templateInfo
        await this.execCommand(installCommand, '依赖安装过程中失败');
        //启动命令执行
        await this.execCommand(startCommand, '启动执行命令失败');
    }

    async createComponentFile(targetPath) {
        const templateInfo = this.templateInfo;
        const projectInfo = this.projectInfo;
        if (templateInfo.tag.includes(TYPE_COMPONENT)) {
            const componentData = {
                ...projectInfo,
                buildPath: templateInfo.buildPath,
                examplePath: templateInfo.examplePath,
                npmVersion: templateInfo.version,
            }
            const componentFile = path.resolve(targetPath, COMPONENT_FILE);
            fs.writeFileSync(componentFile, JSON.stringify(componentData));

        }
    }

    async installCustomTemplate() {
        //查询自定义模板的入口文件
        if (await this.templateNpm.exists()) {
            const rootFile = this.templateNpm.getRootFile();
            if (fs.existsSync(rootFile)) {
                log.notice('开始执行自定义模板');
                const options = {
                    ...this.options,
                    cwd: process.cwd(),
                }
                const code = `require('${rootFile}')(${JSON.stringify(options)})`;
                log.verbose('code', code);
                await execAsync('node', ['-e', code], { stdio: 'inherit', cwd: process.cwd() });
                log.success('自定义模板安装成功');
            } else {
                throw new Error('自定义模板入口文件不存在');
            }
        }
    }

    async downloadTemplate() {
        //1. 通过项目模板API获取项目模板信息
        //1.1 通过egg.js搭建一套后端系统
        //1.2 通过npm存储项目模板
        //1.3 将项目模板信息存储到mongodb数据库中
        //1.4 通过egg.js获取mongodb中的数据并且通过API返回
        const { projectTemplate } = this.projectInfo;
        const templateInfo = this.template.find(item => item.npmName === projectTemplate);
        const targetPath = path.resolve(userHome, '.code-robot-cli', 'template');
        const storeDir = path.resolve(userHome, '.code-robot-cli', 'template', 'node_modules');
        const { npmName, version } = templateInfo;
        this.templateInfo = templateInfo;
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version
        })
        if (! await templateNpm.exists()) {
            const spinner = spinnerStart('正在下载模板...');
            await sleep();
            try {
                await templateNpm.install();
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if (templateNpm.exists()) {
                    log.success('下载模板成功');
                    this.templateNpm = templateNpm;
                }
            }
        } else {
            const spinner = spinnerStart('正在更新模板...');
            await sleep();
            try {
                await templateNpm.update();
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if (templateNpm.exists()) {
                    log.success('更新模板成功');
                    this.templateNpm = templateNpm;
                }
            }
        }
    }


    async prepare() {
        // 判断项目模板是否存在
        const template = await getProjectTemplate();
        if (!template.data || template.data.length === 0) {
            throw new Error('项目模板不存在');
        }
        this.template = template.data;
        //1.判断当前目录是否为空
        const localPath = process.cwd();
        if (!this.isDirEmpty(localPath)) {
            let ifContinue = false;
            if (!this.force) {
                //询问是否继续创建
                ifContinue = (await inquirer.prompt({
                    type: 'confirm',
                    name: 'ifContinue',
                    default: false,
                    message: '当前文件夹不为空，是否继续创建项目?'
                })).ifContinue;
                if (!ifContinue) {
                    return;
                }
            }
            //2.是否启动强制更新
            if (ifContinue || this.force) {
                //给用户二次确认
                const { confirmDelete } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'confirmDelete',
                    default: false,
                    message: '是否确认清空当前目录下的文件?',
                })
                if (confirmDelete) {
                    //清空当前目录
                    fse.emptyDirSync(localPath)
                }
            }
        }
        return this.getProjectInfo();

        //3.选择创建项目或组件
        //4.获取项目得基本信息

    }
    async getProjectInfo() {

        function isValidName(v) {
            return /^(@[a-zA-Z0-9_]+\/)?[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
        }

        let projectInfo = {};
        let isProjectInfoValid = false;
        if (isValidName(this.projectName)) {
            isProjectInfoValid = true;
            projectInfo.projectName = this.projectName;
        }

        //1.选择创建项目或组件
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            message: '请选择初始化类型',
            default: TYPE_PROJECT,
            choices: [{
                name: '项目',
                value: TYPE_PROJECT
            }, {
                name: '组件',
                value: TYPE_COMPONENT
            }]
        });
        log.verbose('type', type);
        this.template = this.template.filter(template => {
            return template.tag.includes(type);
        })
        const title = type === TYPE_PROJECT ? '项目' : '组件';
        //2.获取项目的基本信息
        const projectNamePrompt = {
            type: 'input',
            name: 'projectName',
            message: `请输入${title}的名称`,
            default: '',
            validate: function (v) {
                const done = this.async();
                setTimeout(function () {
                    //1.输入的首字符必须为英文字符
                    //2.尾字符必须为英文或数字，不能为字符
                    //3.字符仅运行"-_"
                    //\w = a-zA-Z0-9  *表示0个或多个
                    if (!isValidName(v)) {
                        done(`请输入合法的${title}名称`);
                        return;
                    }
                    done(null, true);
                }, 0);
            },
            filter: function (v) {
                return v;
            }
        }
        let projectPrompt = [];
        if (!isProjectInfoValid) {
            projectPrompt.push(projectNamePrompt);
        }
        projectPrompt.push({
            input: 'input',
            name: 'projectVersion',
            message: `请输入${title}版本号`,
            default: '1.0.0',
            validate: function (v) {
                const done = this.async();
                setTimeout(function () {
                    //1.输入的首字符必须为英文字符
                    //2.尾字符必须为英文或数字，不能为字符
                    //3.字符仅运行"-_"
                    //\w = a-zA-Z0-9  *表示0个或多个
                    if (!(!!semver.valid(v))) {
                        done('请输入合法的版本号');
                        return;
                    }
                    done(null, true);
                }, 0);
            },
            filter: function (v) {
                if (!!semver.valid(v)) {
                    return semver.valid(v);
                } else {
                    return v;
                }
            }
        }, {
            type: 'list',
            name: 'projectTemplate',
            message: `请选择${title}模板`,
            choices: this.createTemplateChoices()
        });
        if (type === TYPE_PROJECT) {
            const project = await inquirer.prompt(projectPrompt);
            projectInfo = {
                ...projectInfo,
                type,
                ...project
            }
        } else if (type === TYPE_COMPONENT) {
            const descriptionPrompt = {
                input: 'input',
                name: 'componentDescription',
                message: '请输入组件描述信息',
                default: '',
                validate: function (v) {
                    const done = this.async();
                    setTimeout(function () {
                        //1.输入的首字符必须为英文字符
                        //2.尾字符必须为英文或数字，不能为字符
                        //3.字符仅运行"-_"
                        //\w = a-zA-Z0-9  *表示0个或多个
                        if (!v) {
                            done('请输入组件描述信息');
                            return;
                        }
                        done(null, true);
                    }, 0);
                }
            }
            projectPrompt.push(descriptionPrompt);
            const component = await inquirer.prompt(projectPrompt);
            projectInfo = {
                ...projectInfo,
                type,
                ...component
            }
        }
        //return 项目的基本信息(object)
        if (projectInfo.projectName) {
            projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
        }
        if (projectInfo.projectVersion) {
            projectInfo.version = projectInfo.projectVersion;
        }
        if (projectInfo.componentDescription) {
            projectInfo.description = projectInfo.componentDescription;
        }
        return projectInfo;
    }

    isDirEmpty(localPath) {
        let fileList = fs.readdirSync(localPath);
        //文件过滤的逻辑
        fileList = fileList.filter(file => (
            !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
        ));

        return !fileList || fileList.length <= 0;
    }
    createTemplateChoices() {
        return this.template.map(item => ({
            value: item.npmName,
            name: item.name
        }))
    }
}

function init(argv) {
    // console.log('init',projectName,cmdObj.force,process.env.CLI_TARGET_PATH);
    return new InitCommand(argv);
}


module.exports = init;
module.exports.InitCommand = InitCommand;

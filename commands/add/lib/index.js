'use strict';
const path = require('path');
const userHome = require('user-home');
const pathExists = require('path-exists');
const pkgUp = require('pkg-up');
const fse = require('fs-extra');
const semver = require('semver');
const inquirer = require('inquirer');
const glob = require('glob');
const ejs = require('ejs');
const Command = require('@code-robot-cli/command');
const Package = require('@code-robot-cli/package');
const log = require('@code-robot-cli/log');
const { sleep, spinnerStart } = require('@code-robot-cli/utils');

const PAGE_TEMPLATE = [{
    name: 'Vue2首页模板',
    npmName: 'imooc-cli-dev-template-page-vue2',
    version: 'latest',
    targetPath: 'src/views/Home',
    ignore: ['assets/**'],
}]

process.on('unhandledRejection', e => { })

class AddCommand extends Command {
    init() {
        console.log('执行初始化命令');
        //获取add命令的初始化参数
    }
    async exec() {
        //1.获取页面安装文件夹
        this.dir = process.cwd();
        //2.选择页面模板

        //2.1输入页面名称
        this.pageTemplate = await this.getTemplatePageName();
        //3.安装页面模板
        //3.0 预检查（目录重名问题）
        await this.prepare();
        //3.1下载页面模板至缓存目录
        await this.downloadTemplate();
        //3.2将页面模板拷贝至指定目录
        await this.installTemplate();
        //4.合并页面模板依赖
        //5.页面模板安装完成
    }
    async installTemplate() {
        log.info('正在安装页面模板');
        log.verbose('pathTemplate', this.pageTemplate);;
        //模板路径
        const templatePath = path.resolve(this.pageTemplatePackage.cachFilePath, 'template', this.pageTemplate.targetPath);
        //目标路径
        const targetPath = this.targetPath;
        console.log(templatePath);
        if (!await pathExists(templatePath)) {
            throw new Error('页面模板不存在');
        }
        log.verbose('templatePath', templatePath);
        log.verbose('targetPath', targetPath);
        fse.ensureDirSync(templatePath);
        fse.ensureDirSync(targetPath);
        fse.copySync(templatePath, targetPath);
        await this.ejsRender({ targetPath });
        await this.dependenciesMerge({ templatePath, targetPath });
        log.success('安装页面模板成功');
    }
    async ejsRender(options) {
        const { targetPath } = options;
        const pageTemplate = this.pageTemplate;
        const { ignore } = pageTemplate;
        return new Promise((resolve, reject) => {
            glob('**', {
                cwd: targetPath,
                nodir: true,
                ignore: ignore || '',
            }, function (err, files) {
                log.verbose('files', files);
                if (err) {
                    reject(err);
                } else {
                    Promise.all(files.map(file => {
                        // 获取文件的真实路径
                        const filePath = path.resolve(targetPath, file);
                        return new Promise((resolve1, reject1) => {
                            // ejs文件渲染，重新拼接render的参数
                            ejs.renderFile(filePath, {
                                name: pageTemplate.pageName.toLocaleLowerCase(),
                            }, {}, (err, result) => {
                                if (err) {
                                    reject1(err);
                                } else {
                                    // 重新写入文件信息
                                    fse.writeFileSync(filePath, result);
                                    resolve1(result);
                                }
                            });
                        });
                    }))
                        .then(resolve)
                        .catch(e => reject(e));
                }
            });
        });
    }
    // 依赖合并
    async dependenciesMerge(options) {
        function objToArray(o) {
            const arr = [];
            Object.keys(o).forEach(key => {
                arr.push({
                    key,
                    value: o[key],
                });
            });
            return arr;
        }

        function arrayToObj(arr) {
            const o = {};
            arr.forEach(item => o[item.key] = item.value);
            return o;
        }
        function depDiff(templateDepArr, targetDepArr) {
            let finalDep = [...targetDepArr];
            // 1.场景1：模板中存在依赖，项目中不存在（拷贝依赖）
            // 2.场景2：模板中存在依赖，项目也存在（不会拷贝依赖，但是会在脚手架中给予提示，让开发者手动进行处理）
            templateDepArr.forEach(templateDep => {
                const duplicatedDep = targetDepArr.find(targetDep => templateDep.key === targetDep.key);
                if (duplicatedDep) {
                    log.verbose('查询到重复依赖：', duplicatedDep);
                    const templateRange = semver.validRange(templateDep.value).split('<')[1];
                    const targetRange = semver.validRange(duplicatedDep.value).split('<')[1];
                    if (templateRange !== targetRange) {
                        log.warn(`${templateDep.key}冲突，${templateDep.value} => ${duplicatedDep.value}`);
                    }
                } else {
                    log.verbose('查询到新依赖：', templateDep);
                    finalDep.push(templateDep);
                }
            });
            return finalDep;
        }

        // 处理依赖合并问题
        // 1. 获取package.json
        // /Users/xucong/.code-robot-cli/template/node_modules/_imooc-cli-dev-template-page-vue2@1.0.0@imooc-cli-dev-template-page-vue2/template/src/views/Home
        // /Users/xucong/Desktop/test/src/views/Home
        const { templatePath, targetPath } = options;
        // /Users/xucong/.code-robot-cli/template/node_modules/_imooc-cli-dev-template-page-vue2@1.0.0@imooc-cli-dev-template-page-vue2/template/package.json
        const templatePkgPath = pkgUp.sync({ cwd: templatePath });
        // /Users/xucong/Desktop/test/package.json
        const targetPkgPath = pkgUp.sync({ cwd: targetPath });
        const templatePkg = fse.readJsonSync(templatePkgPath);
        const targetPkg = fse.readJsonSync(targetPkgPath);
        // 2. 获取dependencies
        const templateDep = templatePkg.dependencies || {};
        const targetDep = targetPkg.dependencies || {};
        // 3. 将对象转化为数组
        const templateDepArr = objToArray(templateDep);
        const targetDepArr = objToArray(targetDep);
        // 4. 实现dep之间的diff
        const newDep = depDiff(templateDepArr, targetDepArr);
        targetPkg.dependencies = arrayToObj(newDep);
        fse.writeJsonSync(targetPkgPath, targetPkg, { spaces: 2 });
        // 5. 自动安装依赖
        log.info('正在安装页面模板的依赖')
        await this.execCommand('npm install', path.dirname(targetPkgPath));
        log.success('安装页面模板依赖成功');
    }
    async execCommand(command, cwd) {
        let ret;
        if (command) {
            // npm install => [npm, install] => npm, [install]
            const cmdArray = command.split(' ');
            const cmd = cmdArray[0];
            const args = cmdArray.slice(1);
            ret = await execAsync(cmd, args, {
                stdio: 'inherit',
                cwd,
            });
        }
        if (ret !== 0) {
            throw new Error(command + ' 命令执行失败');
        }
        return ret;
    }
    async prepare() {
        //生成最终拷贝路径
        this.targetPath = path.resolve(this.dir, this.pageTemplate.pageName);
        if (await pathExists(this.targetPath)) {
            throw new Error("页面文件夹已经存在");
        }
    }
    async downloadTemplate() {
        //缓存文件夹
        const targetPath = path.resolve(userHome, '.code-robot-cli', 'template');
        //缓存具体路径
        const storeDir = path.resolve(targetPath, 'node_modules');
        const { npmName, version } = this.pageTemplate;
        //构建一个package对象
        const pageTemplatePackage = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version
        });
        //页面模板是否存在
        if (!await pageTemplatePackage.exists()) {
            const spinner = spinnerStart('正在下载页面模板...');
            await sleep();
            //下载页面模板
            try {
                await pageTemplatePackage.install();
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if (await pageTemplatePackage.exists()) {
                    log.success('下载页面模板成功');
                    this.pageTemplatePackage = pageTemplatePackage;
                }
            }
        } else {
            const spinner = spinnerStart('正在更新页面模板...');
            await sleep();
            //更新页面模板
            try {
                await pageTemplatePackage.update();
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if (await pageTemplatePackage.exists()) {
                    log.success('更新页面模板成功');
                    this.pageTemplatePackage = pageTemplatePackage;
                }
            }
        }
    }
    async getTemplatePageName() {
        const pageTemplateName = (await inquirer.prompt({
            type: 'list',
            name: 'pageTemplate',
            message: '请选择页面模板',
            choices: this.createChoices(),
        })).pageTemplate
        const pageTemplate = PAGE_TEMPLATE.find(item => item.npmName === pageTemplateName);
        if (!pageTemplate) {
            throw new Error('页面模板不存在');
        }
        const { pageName } = (await inquirer.prompt({
            type: 'input',
            name: 'pageName',
            message: '请输入页面名称',
            default: '',
            validate: function (v) {
                const done = this.async();
                if (!v || !v.trim()) {
                    done('请输入页面名称');
                    return;
                }
                done(null, true);
            }
        }))
        pageTemplate.pageName = pageName.trim();
        return pageTemplate;
    }
    createChoices() {
        return PAGE_TEMPLATE.map(item => ({
            name: item.name,
            value: item.npmName
        }));
    }
}
function add(argv) {
    // console.log('init',projectName,cmdObj.force,process.env.CLI_TARGET_PATH);
    return new AddCommand(argv);
}
module.exports = add;
module.exports.AddCommand = AddCommand;

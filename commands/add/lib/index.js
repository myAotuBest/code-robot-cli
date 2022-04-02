"use strict";
const path = require("path");
const userHome = require("user-home");
const pathExists = require("path-exists");
const pkgUp = require("pkg-up");
const fs = require("fs");
const fse = require("fs-extra");
const semver = require("semver");
const inquirer = require("inquirer");
const glob = require("glob");
const ejs = require("ejs");
const Command = require("@code-robot-cli/command");
const Package = require("@code-robot-cli/package");
const log = require("@code-robot-cli/log");
const { sleep, spinnerStart } = require("@code-robot-cli/utils");

const PAGE_TEMPLATE = [
    {
        name: "Vue2首页模板",
        npmName: "imooc-cli-dev-template-page-vue2",
        version: "latest",
        targetPath: "src/views/Home",
        ignore: ["assets/**"],
    },
];

const SECTION_TEMPLATE = [
    {
        name: "React代码片段",
        npmName: "@aotu-cli/template-section",
        version: "latest",
    },
];

const ADD_MODE_SECTION = "section";
const ADD_MODE_PAGE = "page";

process.on("unhandledRejection", (e) => { });

class AddCommand extends Command {
    init() {
        console.log("执行初始化命令");
        //获取add命令的初始化参数
    }
    async exec() {
        // 代码片段（区块）：以源码形式拷贝的 react 组件
        // 1. 选择复用方式
        this.addMode = (await this.getAddMode()).addMode;
        log.info("addMode", this.addMode);
        //  选择代码片段模式
        if (this.addMode === ADD_MODE_SECTION) {
            await this.installSectionTemplate();
        } else {
            await this.installPageTemplate();
        }
    }

    async installSectionTemplate() {
        // 1.获取页面安装文件夹
        this.dir = process.cwd();
        // 2.选择代码片段模板
        this.sectionTemplate = await this.getTemplate(ADD_MODE_SECTION);
        console.log(this.sectionTemplate);
        // 3.安装页面模板
        // 3.1 检查目录重名问题
        await this.prepare(ADD_MODE_SECTION);
        // 3.2 代码片段模版下载
        await this.downloadTemplate(ADD_MODE_SECTION);
        // 3.3 代码片段安装
        await this.installSection();
    }

    async installPageTemplate() {
        //1.获取页面安装文件夹
        this.dir = process.cwd();
        //2.选择页面模板
        this.pageTemplate = await this.getTemplate(ADD_MODE_PAGE);
        //3.安装页面模板
        //3.0 预检查（目录重名问题）
        await this.prepare(ADD_MODE_PAGE);
        //3.1下载页面模板至缓存目录
        await this.downloadTemplate(ADD_MODE_PAGE);
        //3.2将页面模板拷贝至指定目录
        //4.合并页面模板依赖
        //5.页面模板安装完成
        await this.installTemplate();
    }

    getAddMode() {
        return inquirer.prompt({
            type: "list",
            name: "addMode",
            message: "请选择代码复用模式",
            choices: [
                {
                    name: "代码片段",
                    value: ADD_MODE_SECTION,
                },
                {
                    name: "页面模版",
                    value: ADD_MODE_PAGE,
                },
            ],
        });
    }

    async installSection() {
        // 1. 选择要插入的源码文件
        const files = fs
            .readdirSync(this.dir, { withFileTypes: true })
            .map((file) => (file.isFile() ? file.name : null))
            .filter((_) => _)
            .map((file) => ({ name: file, value: file }));
        if (files.length === 0) {
            throw new Error("当前文件夹下没有文件！");
        }
        const codeFile = (
            await inquirer.prompt({
                type: "list",
                message: "请选择要插入代码片段的源码文件",
                name: "codeFile",
                choices: files,
            })
        ).codeFile;
        // 2. 需要用户输入插入的行数
        const lineNumber = (
            await inquirer.prompt({
                type: "input",
                message: "请输入要插入的行数",
                name: "lineNumber",
                validate: function (v) {
                    const done = this.async();
                    if (!v || !v.trim()) {
                        done("插入的行数不能为空");
                        return;
                    } else if (v >= 0 && Math.floor(v) === Number(v)) {
                        done(null, true);
                    } else {
                        done("插入的行数必须为整数");
                    }
                },
            })
        ).lineNumber;
        log.verbose("codeFile:", codeFile);
        log.verbose("lineNumber:", lineNumber);
        // 3. 对源码文件进行分割成数组
        const codeFilePath = path.resolve(this.dir, codeFile);
        const codeContent = fs.readFileSync(codeFilePath, "utf-8");
        const codeContentArr = codeContent.split("\n");
        // 4. 以组件形式插入代码片段
        const componentNameOriginal = this.sectionTemplate.sectionName
        const componentName = componentNameOriginal.toLocaleLowerCase();
        codeContentArr.splice(lineNumber, 0, `<${componentName}></${componentName}>`)
        // 5. 插入代码片段的 import 语句
        // vue 需要在 script 插入
        // const scriptIndex = codeContentArr.findIndex(code => code.replace(/\s/g, "") === '<script>')
        // codeContentArr.splice(scriptIndex + 1, 0, `import ${componentNameOriginal} from './components/${componentNameOriginal}/index.vue'`)

        // React 组件直接插入就行了
        codeContentArr.splice(1, 0, `import ${componentNameOriginal} from './components/${componentNameOriginal}'`)
        // 6. 将代码还原成 string
        const newCodeContent = codeContentArr.join("\n")
        fs.writeFileSync(codeFilePath, newCodeContent, "utf-8")
        log.success("代码片段写入成功")
        // 7. 创建代码片段组件目录
        fse.ensureDirSync(this.targetPath)
        const templatePath = path.resolve(this.sectionTemplatePackage.cachFilePath, "template")
        fse.copySync(templatePath, this.targetPath)
        log.success("代码片段拷贝成功")
    }

    async installTemplate() {
        log.info("正在安装页面模板");
        log.verbose("pathTemplate", this.pageTemplate);
        //模板路径
        const templatePath = path.resolve(
            this.templatePackage.cachFilePath,
            "template",
            this.pageTemplate.targetPath
        );
        //目标路径
        const targetPath = this.targetPath;
        console.log(templatePath);
        if (!(await pathExists(templatePath))) {
            throw new Error("页面模板不存在");
        }
        log.verbose("templatePath", templatePath);
        log.verbose("targetPath", targetPath);
        fse.ensureDirSync(templatePath);
        fse.ensureDirSync(targetPath);
        fse.copySync(templatePath, targetPath);
        await this.ejsRender({ targetPath });
        await this.dependenciesMerge({ templatePath, targetPath });
        log.success("安装页面模板成功");
    }
    async ejsRender(options) {
        const { targetPath } = options;
        const pageTemplate = this.pageTemplate;
        const { ignore } = pageTemplate;
        return new Promise((resolve, reject) => {
            glob(
                "**",
                {
                    cwd: targetPath,
                    nodir: true,
                    ignore: ignore || "",
                },
                function (err, files) {
                    log.verbose("files", files);
                    if (err) {
                        reject(err);
                    } else {
                        Promise.all(
                            files.map((file) => {
                                // 获取文件的真实路径
                                const filePath = path.resolve(targetPath, file);
                                return new Promise((resolve1, reject1) => {
                                    // ejs文件渲染，重新拼接render的参数
                                    ejs.renderFile(
                                        filePath,
                                        {
                                            name: pageTemplate.pageName.toLocaleLowerCase(),
                                        },
                                        {},
                                        (err, result) => {
                                            if (err) {
                                                reject1(err);
                                            } else {
                                                // 重新写入文件信息
                                                fse.writeFileSync(filePath, result);
                                                resolve1(result);
                                            }
                                        }
                                    );
                                });
                            })
                        )
                            .then(resolve)
                            .catch((e) => reject(e));
                    }
                }
            );
        });
    }
    // 依赖合并
    async dependenciesMerge(options) {
        function objToArray(o) {
            const arr = [];
            Object.keys(o).forEach((key) => {
                arr.push({
                    key,
                    value: o[key],
                });
            });
            return arr;
        }

        function arrayToObj(arr) {
            const o = {};
            arr.forEach((item) => (o[item.key] = item.value));
            return o;
        }
        function depDiff(templateDepArr, targetDepArr) {
            let finalDep = [...targetDepArr];
            // 1.场景1：模板中存在依赖，项目中不存在（拷贝依赖）
            // 2.场景2：模板中存在依赖，项目也存在（不会拷贝依赖，但是会在脚手架中给予提示，让开发者手动进行处理）
            templateDepArr.forEach((templateDep) => {
                const duplicatedDep = targetDepArr.find(
                    (targetDep) => templateDep.key === targetDep.key
                );
                if (duplicatedDep) {
                    log.verbose("查询到重复依赖：", duplicatedDep);
                    const templateRange = semver
                        .validRange(templateDep.value)
                        .split("<")[1];
                    const targetRange = semver
                        .validRange(duplicatedDep.value)
                        .split("<")[1];
                    if (templateRange !== targetRange) {
                        log.warn(
                            `${templateDep.key}冲突，${templateDep.value} => ${duplicatedDep.value}`
                        );
                    }
                } else {
                    log.verbose("查询到新依赖：", templateDep);
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
        log.info("正在安装页面模板的依赖");
        await this.execCommand("npm install", path.dirname(targetPkgPath));
        log.success("安装页面模板依赖成功");
    }
    async execCommand(command, cwd) {
        let ret;
        if (command) {
            // npm install => [npm, install] => npm, [install]
            const cmdArray = command.split(" ");
            const cmd = cmdArray[0];
            const args = cmdArray.slice(1);
            ret = await execAsync(cmd, args, {
                stdio: "inherit",
                cwd,
            });
        }
        if (ret !== 0) {
            throw new Error(command + " 命令执行失败");
        }
        return ret;
    }
    async prepare(addMode = ADD_MODE_PAGE) {
        //生成最终拷贝路径
        if (addMode === ADD_MODE_PAGE) {
            this.targetPath = path.resolve(this.dir, this.pageTemplate.pageName);
        } else {
            this.targetPath = path.resolve(
                this.dir,
                "components",
                this.sectionTemplate.sectionName
            );
        }
        if (await pathExists(this.targetPath)) {
            throw new Error("页面文件夹已经存在");
        }
    }
    async downloadTemplate(addMode = ADD_MODE_PAGE) {
        const name = addMode === ADD_MODE_PAGE ? "页面" : "代码片段";
        //缓存文件夹
        const targetPath = path.resolve(userHome, ".code-robot-cli", "template");
        //缓存具体路径
        const storeDir = path.resolve(targetPath, "node_modules");
        const { npmName, version } =
            addMode === ADD_MODE_PAGE ? this.pageTemplate : this.sectionTemplate;
        //构建一个package对象
        const templatePackage = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version,
        });
        //页面模板是否存在
        if (!(await templatePackage.exists())) {
            const spinner = spinnerStart(`正在下载${name}模板...`);
            await sleep();
            //下载页面模板
            try {
                await templatePackage.install();
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if (await templatePackage.exists()) {
                    log.success(`下载${name}模板成功`);
                    if (addMode === ADD_MODE_PAGE) {
                        this.pageTemplatePackage = templatePackage;
                    } else {
                        this.sectionTemplatePackage = templatePackage;
                    }
                }
            }
        } else {
            const spinner = spinnerStart(`正在更新${name}模板...`);
            await sleep();
            //更新页面模板
            try {
                await templatePackage.update();
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if (await templatePackage.exists()) {
                    log.success(`更新${name}模板成功`);
                    if (addMode === ADD_MODE_PAGE) {
                        this.pageTemplatePackage = templatePackage;
                    } else {
                        this.sectionTemplatePackage = templatePackage;
                    }
                }
            }
        }
    }
    async getTemplate(addMode = ADD_MODE_PAGE) {
        const name = addMode === ADD_MODE_PAGE ? "页面" : "代码片段";
        const template =
            addMode === ADD_MODE_PAGE ? PAGE_TEMPLATE : SECTION_TEMPLATE;
        const pageTemplateName = (
            await inquirer.prompt({
                type: "list",
                name: "pageTemplate",
                message: `请选择${name}模板`,
                choices: this.createChoices(addMode),
            })
        ).pageTemplate;
        const pageTemplate = template.find(
            (item) => item.npmName === pageTemplateName
        );
        if (!pageTemplate) {
            throw new Error(`${name}模板不存在`);
        }
        //2.1输入页面名称
        const { pageName } = await inquirer.prompt({
            type: "input",
            name: "pageName",
            message: `请输入${name}名称`,
            default: "",
            validate: function (v) {
                const done = this.async();
                if (!v || !v.trim()) {
                    done("请输入页面名称");
                    return;
                }
                done(null, true);
            },
        });
        if (addMode === ADD_MODE_PAGE) {
            pageTemplate.pageName = pageName.trim();
        } else {
            pageTemplate.sectionName = pageName.trim();
        }
        return pageTemplate;
    }
    createChoices(addMode) {
        const template =
            addMode == ADD_MODE_PAGE ? PAGE_TEMPLATE : SECTION_TEMPLATE;
        return template.map((item) => ({
            name: item.name,
            value: item.npmName,
        }));
    }
}
function add(argv) {
    // console.log('init',projectName,cmdObj.force,process.env.CLI_TARGET_PATH);
    return new AddCommand(argv);
}
module.exports = add;
module.exports.AddCommand = AddCommand;

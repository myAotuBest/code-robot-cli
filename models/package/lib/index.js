'use strict';

const path = require('path');
const fse = require('fs-extra');
const pkgDir = require('pkg-dir').sync;
const npminstall = require('npminstall');
const pathExists = require('path-exists').sync;
const { isObject } = require('@code-robot-cli/utils');
const formatPath = require('@code-robot-cli/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@code-robot-cli/get-cli-info');

class Package {
    constructor(options) {
        if (!options) {
            throw new Error('Package类的options参数不能为空!');
        }
        if (!isObject(options)) {
            throw new Error('Package类的options必须是对象!');
        }
        // package的路径
        this.targetPath = options.targetPath;
        //缓存package的路径
        this.storeDir = options.storeDir;
        // package的name
        this.packageName = options.packageName;
        // package的version
        this.packageVersion = options.packageVersion;
        // package的缓存目录前缀
        this.cachFilePathPrefix = this.packageName.replace('/', '_');
    }

    async prepare() {

        if (this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirpSync(this.storeDir);
        }

        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName);
            console.log("this.packageVersion", this.packageVersion);
        }
        //_@imooc-cli_init@1.1.2@@imooc-cli
        //@imooc-cli/init 1.1.2

    }
    get cachFilePath() {
        return path.resolve(this.storeDir, `_${this.cachFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
    }
    getSpeficCachFilePath(packageVersion) {
        return path.resolve(this.storeDir, `_${this.cachFilePathPrefix}@${packageVersion}@${this.packageName}`)
    }
    //判断当前Package是否存在
    async exists() {
        if (this.storeDir) {
            await this.prepare();
            return pathExists(this.cachFilePath);
        } else {
            return pathExists(this.targetPath);
        }
    }

    //安装Package
    install() {
        return npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [
                { name: this.packageName, version: this.packageVersion }
            ]
        })
    }

    //更新Package
    async update() {
        await this.prepare();
        // 1.获取最新的npm模块版本号
        const latestPackageVersion = await getNpmLatestVersion(this.packageName)
        // 2.查询最新版本号路径是否存在
        const latestFilePath = this.getSpeficCachFilePath(latestPackageVersion);
        // 3.如果不存在，则直接安装最新版本
        if (!pathExists(latestFilePath)) {
            await npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [
                    { name: this.packageName, version: latestPackageVersion }
                ]
            })
            this.packageVersion = latestPackageVersion;
        } else {
            this.packageVersion = latestPackageVersion;
        }
    }

    //获取入口文件的路径
    getRootFile() {
        function _getRootFile(targetPath) {
            // 1.获取package.json所在的目录 - pkg-dir
            const dir = pkgDir(targetPath);
            if (dir) {
                // 2.读取package.json - require() js/json/node
                const pkgFile = require(path.resolve(dir, 'package.json'));
                // 3.寻找main/lib - path
                if (pkgFile && pkgFile.main) {
                    // 4.路径的兼容(macOS/windows)
                    return formatPath(path.resolve(dir, pkgFile.main));
                }
            }
            return null;
        }
        if (this.storeDir) {
            return _getRootFile(this.cachFilePath);
        } else {
            return _getRootFile(this.targetPath);
        }

    }

}

module.exports = Package;


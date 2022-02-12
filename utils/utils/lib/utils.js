'use strict';

const cp = require('child_process');
const fs = require('fs');

function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}

function spinnerStart(msg, spinnerString = '|/-\\') {
    const Spinner = require('cli-spinner').Spinner;
    const spinner = new Spinner(msg + ' %s');
    spinner.setSpinnerString(spinnerString);
    spinner.start();
    return spinner;
}

function sleep(timeout = 1000) {
    return new Promise((resolve, reject) => setTimeout(resolve, timeout));

}

function exec(command, args, options) {
    const win32 = process.platform === 'win32';

    const cmd = win32 ? 'cmd' : command;
    const cmdArgs = win32 ? ['/c'].concat(command, args) : args;

    return cp.spawn(cmd, cmdArgs, options || {});
}

function execAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const p = exec(command, args, options);
        p.on('err', e => {
            reject(e);
        });
        p.on('exit', c => {
            resolve(c);
        });
    })
}

function readFile(path, options = {}) {
    if (fs.existsSync(path)) {
        const buffer = fs.readFileSync(path);
        if (buffer) {
            if (options.toJson) {
                return buffer.toJSON();
            } else {
                return buffer.toString();
            }
        }
    }
}

function writeFile(path, data, { rewrite = true } = {}) {
    if (fs.existsSync(path)) {
        if (rewrite) {
            fs.writeFileSync(path, data);
            return true;
        } else {
            return false;
        }
    } else {
        fs.writeFileSync(path, data);
        return true;
    }
}

module.exports = {
    isObject,
    spinnerStart,
    sleep,
    exec,
    execAsync,
    readFile,
    writeFile
};


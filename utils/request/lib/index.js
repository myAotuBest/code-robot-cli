'use strict';

const axios = require('axios');

const BASE_URL = process.env.ROY_CLI_BASE_URL ? process.env.ROY_CLI_BASE_URL : "http://127.0.0.1:7001/";

const request = axios.create({
    baseURL: BASE_URL,
    timeout: 5000
});

request.interceptors.response.use(
    response => {
        return response.data;
    },
    error => {
        return Promise.reject(error);
    }
)

// const request = function () {
//     return [{
//         name: 'vue3标准模板',
//         npmName: 'roy-cli-dev-template',
//         type: 'normal',
//         installCommand: 'npm install --registry=https://registry.npm.taobao.org/',
//         startCommand: 'npm run serve',
//         version: '1.0.0',
//         tag: ['project'],
//         ignore: ['**/public/**']
//     }, {
//         name: 'vue2管理后台模板',
//         npmName: 'roy-cli-dev-template-vue-element-admin',
//         type: 'normal',
//         installCommand: 'npm install --registry=https://registry.npm.taobao.org/',
//         startCommand: 'npm run serve',
//         version: '1.0.0',
//         tag: ['project'],
//         ignore: ['**/public/**']
//     }, {
//         name: 'vue2自定义模板',
//         npmName: 'imooc-cli-dev-template-custom-vue2',
//         type: 'custom',
//         installCommand: 'npm install --registry=https://registry.npm.taobao.org/',
//         startCommand: 'npm run serve',
//         version: '1.0.0',
//         tag: ['project'],
//         ignore: ['**/public/**']
//     }, {
//         name: '组件库模板',
//         npmName: 'roy-cli-dev-lego-components',
//         type: 'normal',
//         installCommand: 'npm install --registry=https://registry.npm.taobao.org/',
//         startCommand: 'npm run serve',
//         version: '1.0.0',
//         tag: ['component'],
//         ignore: ['**/public/**','**.png']
//     }]
// }

module.exports = request;


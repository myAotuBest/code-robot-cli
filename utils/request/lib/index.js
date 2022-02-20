/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-03-09 22:33:06
 * @LastEditors: Roy
 * @LastEditTime: 2022-02-12 17:38:19
 * @Deprecated: 否
 * @FilePath: /code-robot-cli/utils/request/lib/index.js
 */
'use strict';

const axios = require('axios');

const BASE_URL = process.env.ROY_CLI_BASE_URL ? process.env.ROY_CLI_BASE_URL : "http://115.28.139.70:7003/";

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


/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-03-09 22:40:19
 * @LastEditors: Roy
 * @LastEditTime: 2021-03-09 22:41:15
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/commands/init/lib/getProjectTemplate.js
 */
const request = require('@code-robot-cli/request');

module.exports = function () {
    return request({
        url: '/project/template'
    })
}
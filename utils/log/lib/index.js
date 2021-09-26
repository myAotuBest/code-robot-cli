/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-02-25 20:31:41
 * @LastEditors: Roy
 * @LastEditTime: 2021-02-25 21:16:46
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/utils/log/lib/index.js
 */
'use strict';


const log = require('npmlog')

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";//判断debug模式
log.heading = "roy";//修改前缀
log.addLevel('success',2000,{fg:'green',bold:true});//添加自定义命令

module.exports = log;

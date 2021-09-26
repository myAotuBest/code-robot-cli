/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-03-04 20:56:52
 * @LastEditors: Roy
 * @LastEditTime: 2021-03-04 21:02:34
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/utils/format-path/lib/index.js
 */
'use strict';

const path = require('path');

module.exports = function formatPath(p) {
    if (p && typeof p === 'string') {
        const sep = path.sep;
        if (sep === '/') {
            return p;
        } else {
            return p.replace(/\\/g,'/')
        }
    }
    return p;
}

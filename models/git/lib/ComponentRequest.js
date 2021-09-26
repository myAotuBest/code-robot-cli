/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-08-08 14:23:22
 * @LastEditors: Roy
 * @LastEditTime: 2021-08-08 16:14:31
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/models/git/lib/ComponentRequest.js
 */
const axios = require('axios');
const log = require('@code-robot-cli/log');

module.exports = {
    createComponent: async function (component) {
        try {
            const response = await axios.post('http://127.0.0.1:7001/api/v1/components', component);
            log.verbose('response', response);
            const { data } = response;
            if (data.code === 0) {
                return data.data;
            }
            return null;
        } catch (e) {
            throw e;
        }
    }
}

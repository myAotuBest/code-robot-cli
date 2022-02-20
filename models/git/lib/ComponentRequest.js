/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-08-08 14:23:22
 * @LastEditors: Roy
 * @LastEditTime: 2022-02-12 17:37:46
 * @Deprecated: 否
 * @FilePath: /code-robot-cli/models/git/lib/ComponentRequest.js
 */
const axios = require('axios');
const log = require('@code-robot-cli/log');

module.exports = {
    createComponent: async function (component) {
        try {
            const response = await axios.post('http://115.28.139.70:7003/api/v1/components', component);
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

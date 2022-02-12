const request = require('@code-robot-cli/request');

module.exports = function () {
    return request({
        url: '/project/template'
    })
}
/*
 * @message: 描述
 * @Author: Roy
 * @Email: @163.com
 * @Github: @163.com
 * @Date: 2021-07-05 21:39:19
 * @LastEditors: Roy
 * @LastEditTime: 2021-07-05 22:32:18
 * @Deprecated: 否
 * @FilePath: /roy-cli-dev/models/git/lib/GithubRequest.js
 */

const axios = require('axios');
const BASE_URL = "https://api.github.com";

class GithubRequest {
    constructor(token) {
        this.token = token;
        this.service = axios.create({
            baseURL: BASE_URL,
            timeout: 5000,
        });
        this.service.interceptors.request.use(
            config => {
                config.headers['Authorization'] = `token ${this.token}`;
                return config;
            },
            error => {
                Promise.reject(error);
            },
        );
        this.service.interceptors.response.use(
            response => {
                return response.data;
            },
            error => {
                if (error.response && error.response.data) {
                    return error.response;
                } else {
                    return Promise.reject(error);
                }
            },
        );
    }

    get(url, params, headers) {
        return this.service({
            url,
            params,
            method: 'get',
            headers,
        });
    }

    post(url, data, headers) {
        return this.service({
            url,
            data,
            method: 'post',
            headers,
        });
    }
}

module.exports = GithubRequest;
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

module.exports = request;


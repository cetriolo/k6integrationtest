import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1, // 1 virtual user
    duration: '1m', // duration 1 minute
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
        http_req_failed: ['rate<0.01'], // less than 1% errors
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Test health endpoint
    let res = http.get(`${BASE_URL}/health`);
    check(res, {
        'health status is 200': (r) => r.status === 200,
        'health response contains status': (r) => r.json('status') === 'ok',
    });

    sleep(1);

    // Test users endpoint
    res = http.get(`${BASE_URL}/api/users`);
    check(res, {
        'users status is 200': (r) => r.status === 200,
        'users response is an array': (r) => Array.isArray(r.json()),
        'users response has elements': (r) => r.json().length > 0,
    });

    sleep(1);

    // Test products endpoint
    res = http.get(`${BASE_URL}/api/products`);
    check(res, {
        'products status is 200': (r) => r.status === 200,
        'products response is an array': (r) => Array.isArray(r.json()),
        'products response has elements': (r) => r.json().length > 0,
    });

    sleep(1);

    // Test authentication flow
    const loginPayload = JSON.stringify({
        username: 'admin',
        password: 'admin123',
    });

    const loginParams = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);
    check(res, {
        'login status is 200': (r) => r.status === 200,
        'login returns token': (r) => r.json('token') !== undefined,
    });

    const token = res.json('token');

    if (token) {
        sleep(1);

        // Test authenticated endpoint
        const authParams = {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        };

        res = http.get(`${BASE_URL}/api/auth/verify`, authParams);
        check(res, {
            'verify status is 200': (r) => r.status === 200,
            'verify returns authenticated true': (r) => r.json('authenticated') === true,
        });

        sleep(1);

        // Test logout
        res = http.post(`${BASE_URL}/api/auth/logout`, null, authParams);
        check(res, {
            'logout status is 200': (r) => r.status === 200,
        });
    }

    sleep(1);
}

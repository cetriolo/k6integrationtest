import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Ramp up to 10 users
        { duration: '1m', target: 10 },   // Stay at 10 users
        { duration: '30s', target: 50 },  // Ramp up to 50 users
        { duration: '2m', target: 50 },   // Stay at 50 users
        { duration: '30s', target: 0 },   // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
        http_req_failed: ['rate<0.05'],    // less than 5% errors
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Test public endpoints
    let res = http.get(`${BASE_URL}/health`);
    check(res, {
        'health status is 200': (r) => r.status === 200,
    });

    sleep(0.5);

    res = http.get(`${BASE_URL}/api/users`);
    check(res, {
        'users status is 200': (r) => r.status === 200,
    });

    sleep(0.5);

    res = http.get(`${BASE_URL}/api/products`);
    check(res, {
        'products status is 200': (r) => r.status === 200,
    });

    sleep(0.5);

    // Test authentication
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
        'login successful': (r) => r.status === 200 && r.json('token') !== undefined,
    });

    const token = res.json('token');

    if (token) {
        sleep(0.5);

        const authParams = {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        };

        // Test authenticated endpoints
        res = http.get(`${BASE_URL}/api/auth/verify`, authParams);
        check(res, {
            'verify authenticated': (r) => r.status === 200,
        });

        sleep(0.5);

        // Logout
        res = http.post(`${BASE_URL}/api/auth/logout`, null, authParams);
        check(res, {
            'logout successful': (r) => r.status === 200,
        });
    }

    sleep(1);
}
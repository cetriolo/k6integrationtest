import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '2m', target: 200 },  // Ramp up to 200 users
        { duration: '3m', target: 200 },  // Stay at 200 users (stress)
        { duration: '1m', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
        http_req_failed: ['rate<0.1'],     // less than 10% errors
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Mix of requests to different endpoints
    const endpoints = [
        `${BASE_URL}/health`,
        `${BASE_URL}/api/users`,
        `${BASE_URL}/api/products`,
    ];

    // Random endpoint selection
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    let res = http.get(endpoint);
    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    // Occasionally test authentication flow
    if (Math.random() < 0.3) { // 30% of requests
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
            'login successful': (r) => r.status === 200,
        });

        const token = res.json('token');

        if (token) {
            const authParams = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            };

            res = http.get(`${BASE_URL}/api/auth/verify`, authParams);
            check(res, {
                'verify successful': (r) => r.status === 200,
            });

            res = http.post(`${BASE_URL}/api/auth/logout`, null, authParams);
        }
    }

    sleep(0.3);
}
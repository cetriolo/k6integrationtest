import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const uploadDuration = new Trend('upload_duration');

export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Warm up
        { duration: '1m', target: 50 },   // Ramp up
        { duration: '3m', target: 100 },  // Sustained load
        { duration: '1m', target: 150 },  // Peak load
        { duration: '2m', target: 100 },  // Back to sustained
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<1500'],
        http_req_failed: ['rate<0.05'],
        'errors': ['rate<0.1'],
        'auth_duration': ['p(95)<1000'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Test health endpoint
    let res = http.get(`${BASE_URL}/health`);
    errorRate.add(res.status !== 200);
    check(res, {
        'health is ok': (r) => r.status === 200,
    });

    sleep(0.5);

    // Test users endpoint
    res = http.get(`${BASE_URL}/api/users`);
    errorRate.add(res.status !== 200);
    check(res, {
        'users retrieved': (r) => r.status === 200,
    });

    sleep(0.5);

    // Test products endpoint
    res = http.get(`${BASE_URL}/api/products`);
    errorRate.add(res.status !== 200);
    check(res, {
        'products retrieved': (r) => r.status === 200,
    });

    sleep(0.5);

    // Test complete authentication flow
    const authStart = Date.now();

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

    const loginSuccess = check(res, {
        'login successful': (r) => r.status === 200 && r.json('token') !== undefined,
    });
    errorRate.add(!loginSuccess);

    const token = res.json('token');

    if (token) {
        sleep(0.3);

        const authParams = {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        };

        // Verify token
        res = http.get(`${BASE_URL}/api/auth/verify`, authParams);
        const verifySuccess = check(res, {
            'token verified': (r) => r.status === 200 && r.json('authenticated') === true,
        });
        errorRate.add(!verifySuccess);

        authDuration.add(Date.now() - authStart);

        sleep(0.5);

        // Test accessing protected resources
        res = http.get(`${BASE_URL}/api/users`, authParams);
        errorRate.add(res.status !== 200);

        sleep(0.3);

        // Logout
        res = http.post(`${BASE_URL}/api/auth/logout`, null, authParams);
        const logoutSuccess = check(res, {
            'logout successful': (r) => r.status === 200,
        });
        errorRate.add(!logoutSuccess);

        sleep(0.3);

        // Verify token is invalidated
        res = http.get(`${BASE_URL}/api/auth/verify`, authParams);
        check(res, {
            'token invalidated': (r) => r.status === 401,
        });
    }

    sleep(1);
}

export function handleSummary(data) {
    return {
        'stdout': JSON.stringify(data, null, 2),
        'performance-report.json': JSON.stringify(data),
    };
}
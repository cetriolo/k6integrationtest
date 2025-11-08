import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
    vus: 10,
    duration: '2m',
    thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.01'],
        'group_duration{group:::01_login}': ['p(95)<500'],
        'group_duration{group:::02_verify}': ['p(95)<300'],
        'group_duration{group:::03_access_resources}': ['p(95)<800'],
        'group_duration{group:::04_logout}': ['p(95)<300'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Test different user credentials
const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'user', password: 'user123' },
    { username: 'test', password: 'test123' },
];

export default function () {
    // Select a random user
    const user = users[Math.floor(Math.random() * users.length)];
    let token;

    // Group 1: Login
    group('01_login', function () {
        const loginPayload = JSON.stringify({
            username: user.username,
            password: user.password,
        });

        const loginParams = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);

        check(res, {
            'login status is 200': (r) => r.status === 200,
            'login returns token': (r) => r.json('token') !== undefined,
            'login returns message': (r) => r.json('message') !== undefined,
        });

        token = res.json('token');
    });

    if (!token) {
        return; // Exit if login failed
    }

    sleep(0.5);

    const authParams = {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    // Group 2: Verify authentication
    group('02_verify', function () {
        const res = http.get(`${BASE_URL}/api/auth/verify`, authParams);

        check(res, {
            'verify status is 200': (r) => r.status === 200,
            'verify returns authenticated true': (r) => r.json('authenticated') === true,
            'verify returns username': (r) => r.json('username') === user.username,
        });
    });

    sleep(0.5);

    // Group 3: Access protected resources
    group('03_access_resources', function () {
        // Access users endpoint with auth
        let res = http.get(`${BASE_URL}/api/users`, authParams);
        check(res, {
            'users access successful': (r) => r.status === 200,
        });

        sleep(0.3);

        // Access products endpoint with auth
        res = http.get(`${BASE_URL}/api/products`, authParams);
        check(res, {
            'products access successful': (r) => r.status === 200,
        });
    });

    sleep(0.5);

    // Group 4: Logout
    group('04_logout', function () {
        const res = http.post(`${BASE_URL}/api/auth/logout`, null, authParams);

        check(res, {
            'logout status is 200': (r) => r.status === 200,
            'logout returns message': (r) => r.json('message') !== undefined,
        });
    });

    sleep(0.5);

    // Group 5: Verify token is invalidated
    group('05_verify_invalidation', function () {
        const res = http.get(`${BASE_URL}/api/auth/verify`, authParams);

        check(res, {
            'verify fails after logout': (r) => r.status === 401,
            'error message present': (r) => r.json('error') !== undefined,
        });
    });

    sleep(1);
}

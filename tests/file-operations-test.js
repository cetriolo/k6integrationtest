import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export const options = {
    vus: 5,
    duration: '2m',
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.05'],
        'group_duration{group:::upload}': ['p(95)<1500'],
        'group_duration{group:::download}': ['p(95)<1000'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Generate test file content
function generateTestFile(size = 1024) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let content = '';
    for (let i = 0; i < size; i++) {
        content += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return content;
}

export default function () {
    // Step 1: Login to get authentication token
    const loginPayload = JSON.stringify({
        username: 'admin',
        password: 'admin123',
    });

    const loginParams = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    let res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);

    check(res, {
        'login successful': (r) => r.status === 200,
    });

    const token = res.json('token');

    if (!token) {
        return; // Exit if login failed
    }

    sleep(0.5);

    let uploadedFilename;

    // Step 2: Upload file
    group('upload', function () {
        const formData = new FormData();
        const fileContent = generateTestFile(2048); // 2KB file
        formData.append('file', http.file(fileContent, 'test-file.txt', 'text/plain'));

        const uploadParams = {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        };

        res = http.post(`${BASE_URL}/api/files/upload`, formData.body(), uploadParams);

        const uploadSuccess = check(res, {
            'upload status is 201': (r) => r.status === 201,
            'upload returns filename': (r) => r.json('filename') !== undefined,
            'upload returns size': (r) => r.json('size') !== undefined,
            'upload returns message': (r) => r.json('message') !== undefined,
        });

        if (uploadSuccess) {
            uploadedFilename = res.json('filename');
        }
    });

    if (!uploadedFilename) {
        return; // Exit if upload failed
    }

    sleep(0.5);

    // Step 3: Download the uploaded file
    group('download', function () {
        const downloadParams = {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        };

        res = http.get(`${BASE_URL}/api/files/download/${uploadedFilename}`, downloadParams);

        check(res, {
            'download status is 200': (r) => r.status === 200,
            'download returns content': (r) => r.body.length > 0,
            'content-type is octet-stream': (r) =>
                r.headers['Content-Type'] === 'application/octet-stream',
        });
    });

    sleep(0.5);

    // Step 4: Test download multiple times (simulate multiple downloads)
    group('multiple_downloads', function () {
        const downloadParams = {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        };

        for (let i = 0; i < 3; i++) {
            res = http.get(`${BASE_URL}/api/files/download/${uploadedFilename}`, downloadParams);
            check(res, {
                [`download ${i + 1} successful`]: (r) => r.status === 200,
            });
            sleep(0.2);
        }
    });

    sleep(0.5);

    // Step 5: Test unauthorized access (without token)
    group('unauthorized_access', function () {
        res = http.post(`${BASE_URL}/api/files/upload`, null);
        check(res, {
            'upload without auth fails': (r) => r.status === 401,
        });

        res = http.get(`${BASE_URL}/api/files/download/${uploadedFilename}`);
        check(res, {
            'download without auth fails': (r) => r.status === 401,
        });
    });

    sleep(0.5);

    // Step 6: Logout
    const authParams = {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    res = http.post(`${BASE_URL}/api/auth/logout`, null, authParams);
    check(res, {
        'logout successful': (r) => r.status === 200,
    });

    sleep(1);
}

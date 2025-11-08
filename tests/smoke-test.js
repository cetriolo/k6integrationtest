import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1, // 1 utente virtuale
    duration: '1m', // durata 1 minuto
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% delle richieste sotto 500ms
        http_req_failed: ['rate<0.01'], // meno dell'1% di errori
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Test endpoint health
    let res = http.get(`${BASE_URL}/health`);
    check(res, {
        'health status è 200': (r) => r.status === 200,
        'health response contiene status': (r) => r.json('status') === 'ok',
    });

    sleep(1);

    // Test endpoint users
    res = http.get(`${BASE_URL}/api/users`);
    check(res, {
        'users status è 200': (r) => r.status === 200,
        'users response è un array': (r) => Array.isArray(r.json()),
        'users response ha elementi': (r) => r.json().length > 0,
    });

    sleep(1);

    // Test endpoint products
    res = http.get(`${BASE_URL}/api/products`);
    check(res, {
        'products status è 200': (r) => r.status === 200,
        'products response è un array': (r) => Array.isArray(r.json()),
        'products response ha elementi': (r) => r.json().length > 0,
    });

    sleep(1);
}
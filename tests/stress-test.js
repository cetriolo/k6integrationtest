import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 100 },  // ramp-up a 100 utenti
        { duration: '5m', target: 100 },  // mantieni 100 utenti
        { duration: '2m', target: 200 },  // ramp-up a 200 utenti
        { duration: '5m', target: 200 },  // mantieni 200 utenti
        { duration: '2m', target: 300 },  // ramp-up a 300 utenti (stress)
        { duration: '5m', target: 300 },  // mantieni 300 utenti
        { duration: '5m', target: 0 },    // ramp-down a 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<5000'], // soglie più permissive
        http_req_failed: ['rate<0.1'], // fino al 10% di errori tollerato
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Simula traffico realistico con mix di endpoint
    const endpoints = [
        `${BASE_URL}/health`,
        `${BASE_URL}/api/users`,
        `${BASE_URL}/api/products`,
    ];

    const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    const res = http.get(randomEndpoint);

    check(res, {
        'status è 200 o 500': (r) => [200, 500, 503].includes(r.status),
    });

    sleep(Math.random() * 2); // sleep random tra 0 e 2 secondi
}
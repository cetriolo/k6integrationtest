import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 50 }, // ramp-up a 50 utenti in 2 minuti
        { duration: '5m', target: 50 }, // mantieni 50 utenti per 5 minuti
        { duration: '2m', target: 0 },  // ramp-down a 0 utenti in 2 minuti
    ],
    thresholds: {
        http_req_duration: ['p(95)<800', 'p(99)<1500'], // 95% sotto 800ms, 99% sotto 1.5s
        http_req_failed: ['rate<0.05'], // meno del 5% di errori
        http_reqs: ['rate>100'], // almeno 100 richieste al secondo
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    const responses = http.batch([
        ['GET', `${BASE_URL}/health`],
        ['GET', `${BASE_URL}/api/users`],
        ['GET', `${BASE_URL}/api/products`],
    ]);

    check(responses[0], {
        'health status è 200': (r) => r.status === 200,
    });

    check(responses[1], {
        'users status è 200': (r) => r.status === 200,
        'users tempo risposta ok': (r) => r.timings.duration < 200,
    });

    check(responses[2], {
        'products status è 200': (r) => r.status === 200,
        'products tempo risposta ok': (r) => r.timings.duration < 200,
    });

    sleep(1);
}
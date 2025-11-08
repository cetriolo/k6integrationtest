import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Metriche custom
const errorRate = new Rate('errors');
const customTrend = new Trend('custom_response_time');

export const options = {
    stages: [
        { duration: '1m', target: 20 },  // warm-up
        { duration: '3m', target: 100 }, // carico normale
        { duration: '1m', target: 20 },  // cool-down
    ],
    thresholds: {
        http_req_duration: [
            'p(50)<100',   // 50% sotto 100ms
            'p(90)<500',   // 90% sotto 500ms
            'p(95)<800',   // 95% sotto 800ms
            'p(99)<2000',  // 99% sotto 2s
        ],
        http_req_failed: ['rate<0.02'], // meno del 2% di errori
        errors: ['rate<0.05'], // meno del 5% di errori custom
        custom_response_time: ['p(95)<1000'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Test con pesi diversi per simulare traffico realistico
    const randomValue = Math.random();

    let res;
    if (randomValue < 0.6) {
        // 60% traffic su products
        res = http.get(`${BASE_URL}/api/products`);
    } else if (randomValue < 0.9) {
        // 30% traffic su users
        res = http.get(`${BASE_URL}/api/users`);
    } else {
        // 10% traffic su health
        res = http.get(`${BASE_URL}/health`);
    }

    const success = check(res, {
        'status è 200': (r) => r.status === 200,
        'response time < 1s': (r) => r.timings.duration < 1000,
        'body non vuoto': (r) => r.body.length > 0,
    });

    // Registra errori custom
    errorRate.add(!success);
    customTrend.add(res.timings.duration);

    sleep(0.5);
}

export function handleSummary(data) {
    return {
        'stdout': JSON.stringify(data, null, 2),
        'performance-report.json': JSON.stringify(data),
    };
}
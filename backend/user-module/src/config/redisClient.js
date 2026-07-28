const Redis = require('ioredis');

let client = null;

function getRedisClient() {
    if (client) return client;

    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
    });

    client.on('error', (err) => {
        console.error('[redis] connection error:', err.message);
    });

    return client;
}

module.exports = { getRedisClient };
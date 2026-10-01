/** Serves "Hello world" at /hello on port 3000 and prints "Welcome to Blitzy" once listening. */
require('http').createServer((req, res) => res.end(req.url === '/hello' ? 'Hello world' : '')).listen(3000, () => console.log('Welcome to Blitzy'));

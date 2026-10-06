/** Tests GET /good-evening, the preserved GET /hello route, server startup and unmatched URLs. */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

let server;
let stdout = '';
let stderr = '';

before(() => new Promise((resolve, reject) => {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')]);
  server.stdout.on('data', (chunk) => { stdout += chunk; if (stdout.includes('Welcome to Blitzy')) resolve(); });
  server.stderr.on('data', (chunk) => { stderr += chunk; });
  server.on('error', reject);
  server.on('exit', (code) => reject(new Error(`server exited with code ${code}: ${stderr}`)));
}));

after(() => { server.kill(); });

describe('server startup', () => {
  it('starts without errors with both endpoints registered', () => {
    assert.equal(stdout, 'Welcome to Blitzy\n');
    assert.equal(stderr, '');
  });
});

describe('GET /good-evening', () => {
  it('returns HTTP 200', async () => {
    const res = await fetch('http://localhost:3000/good-evening');
    assert.equal(res.status, 200);
  });
  it('returns the exact body "Good evening"', async () => {
    const res = await fetch('http://localhost:3000/good-evening');
    assert.equal(await res.text(), 'Good evening');
  });
  it('returns Content-Type text/plain', async () => {
    const res = await fetch('http://localhost:3000/good-evening');
    assert.equal(res.headers.get('content-type'), 'text/plain');
  });
});

describe('GET /hello', () => {
  it('returns HTTP 200', async () => {
    const res = await fetch('http://localhost:3000/hello');
    assert.equal(res.status, 200);
  });
  it('continues to return the exact body "Hello world"', async () => {
    const res = await fetch('http://localhost:3000/hello');
    assert.equal(await res.text(), 'Hello world');
  });
  // /hello keeps its original header set; the header hardening of Clone-QA-20-Apr-rules is deliberately not applied.
  it('continues to send no Content-Type header', async () => {
    const res = await fetch('http://localhost:3000/hello');
    assert.equal(res.headers.get('content-type'), null);
  });
});

describe('unmatched URLs', () => {
  it('continue to return HTTP 200 with an empty body', async () => {
    const res = await fetch('http://localhost:3000/other');
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '');
  });
});

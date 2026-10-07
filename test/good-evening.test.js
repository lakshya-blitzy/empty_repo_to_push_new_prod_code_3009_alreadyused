/** Spawns server.js because loading it binds port 3000 without exporting a server handle. */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const BASE_URL = 'http://localhost:3000';

let server, closed, stdout = '', stderr = '';

before(() => new Promise((resolve, reject) => {
  // Neither an interrupt nor an uncaught exception may leave the child holding port 3000. Each signal
  // listener is removed before its callback runs, so re-raising the signal ends this process by that signal.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server?.kill('SIGKILL');
      process.kill(process.pid, signal);
    });
  }
  process.once('uncaughtExceptionMonitor', () => {
    server?.kill('SIGKILL');
    process.exitCode = 1;
  });
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')]);
  server.on('error', reject);
  closed = new Promise((done) => server.on('close', done));
  // Wait for 'close' so stderr is complete; once the server is ready this rejection is a no-op.
  server.on('exit', (code, signal) => closed.then(() => {
    reject(new Error(`server exited with code ${code}, signal ${signal}: ${stderr}`));
  }));
  // The pipes are absent when spawn fails for lack of file descriptors; the 'error' listener reports that.
  server.stdout?.on('data', (chunk) => { stdout += chunk; if (stdout.includes('Welcome to Blitzy\n')) resolve(); });
  server.stderr?.on('data', (chunk) => { stderr += chunk; });
}), { timeout: 5000 });

after(async () => {
  let forced = false;
  const timer = setTimeout(() => { forced = true; server?.kill('SIGKILL'); }, 3000);
  server?.kill();
  await closed;
  clearTimeout(timer);
  assert.equal(forced, false, 'server did not close within 3000 ms of SIGTERM and was sent SIGKILL');
  if (stdout.includes('Welcome to Blitzy\n')) assert.deepEqual({ stdout, stderr }, { stdout: 'Welcome to Blitzy\n', stderr: '' });
}, { timeout: 5000 });

describe('server startup', () => {
  it('starts without errors with both endpoints registered', () => {
    assert.equal(stdout, 'Welcome to Blitzy\n');
    assert.equal(stderr, '');
  });
});

describe('GET /good-evening', () => {
  it('returns HTTP 200', async () => {
    const res = await fetch(`${BASE_URL}/good-evening`, { redirect: 'manual' });
    assert.equal(res.status, 200);
  });

  it('returns the exact body "Good evening"', async () => {
    const res = await fetch(`${BASE_URL}/good-evening`, { redirect: 'manual' });
    assert.equal(await res.text(), 'Good evening');
  });

  it('returns Content-Type text/plain', async () => {
    const res = await fetch(`${BASE_URL}/good-evening`, { redirect: 'manual' });
    assert.equal(res.headers.get('content-type'), 'text/plain');
  });
});

describe('GET /hello', () => {
  it('returns HTTP 200', async () => {
    const res = await fetch(`${BASE_URL}/hello`, { redirect: 'manual' });
    assert.equal(res.status, 200);
  });

  it('continues to return the exact body "Hello world"', async () => {
    const res = await fetch(`${BASE_URL}/hello`, { redirect: 'manual' });
    assert.equal(await res.text(), 'Hello world');
  });

  // Only /good-evening sets Content-Type; /hello keeps its original header set.
  it('continues to send no Content-Type header', async () => {
    const res = await fetch(`${BASE_URL}/hello`, { redirect: 'manual' });
    assert.equal(res.headers.get('content-type'), null);
  });
});

describe('unmatched URLs', () => {
  it('continue to return HTTP 200 with an empty body', async () => {
    const res = await fetch(`${BASE_URL}/other`, { redirect: 'manual' });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '');
  });
});

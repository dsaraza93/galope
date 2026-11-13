import {defineConfig} from 'vitest/config';
import {cloudflareTest,readD1Migrations} from '@cloudflare/vitest-plugin';
import fs from 'node:fs';
export default defineConfig({plugins:[cloudflareTest({wrangler:{configPath:'./wrangler.jsonc'},miniflare:{bindings:{TEST_MIGRATIONS:await readD1Migrations('./migrations'),TEST_DEMO:fs.readFileSync('./tests/fixture.sql','utf8'),TEST_BOOTSTRAP:fs.readFileSync('./scripts/bootstrap.sql','utf8'),GOOGLE_CLIENT_ID:'test-client.apps.googleusercontent.com',ADMIN_EMAILS:'admin@example.test',BOLD_TEST_API_KEY:'test-only-public-key',BOLD_TEST_SECRET_KEY:'test-only-integrity-key',BOLD_WEBHOOK_SECRET:'test-only-webhook-key'}}})],test:{include:['tests/**/*.test.js'],fileParallelism:false,testTimeout:30000,hookTimeout:30000}});

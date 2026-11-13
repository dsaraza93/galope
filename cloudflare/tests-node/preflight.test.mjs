import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('preflight impide desplegar con placeholders y activar producción sin evidencia',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bc-preflight-'));try{
 fs.mkdirSync(path.join(dir,'scripts'));fs.copyFileSync('scripts/preflight.mjs',path.join(dir,'scripts/preflight.mjs'));
 const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));const run=()=>{fs.writeFileSync(path.join(dir,'wrangler.jsonc'),JSON.stringify(config));return spawnSync(process.execPath,[path.join(dir,'scripts/preflight.mjs')],{encoding:'utf8'});};
 config.d1_databases[0].database_id='00000000-0000-0000-0000-000000000000';config.vars.GOOGLE_CLIENT_ID='';config.vars.ADMIN_EMAILS='';
 assert.notEqual(run().status,0);config.d1_databases[0].database_id='11111111-2222-3333-4444-555555555555';config.vars.GOOGLE_CLIENT_ID='fixture.apps.googleusercontent.com';config.vars.ADMIN_EMAILS='admin@example.test';assert.equal(run().status,0);
 config.vars.BOLD_MODE='production';config.vars.BOLD_ENABLE_LIVE_PAYMENTS='yes';config.vars.BOLD_PRODUCTION_VERIFIED='yes';const blocked=run();assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/Producción bloqueada/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

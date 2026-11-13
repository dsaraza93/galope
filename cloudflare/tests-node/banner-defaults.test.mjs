import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bannerOptions} from '../src/banner-options.js';
test('banners iniciales de Galope permiten guardar su imagen local',()=>{
 for(const customImage of ['/img/logo.webp','/img/club-galope.webp','/uploads/'+'a'.repeat(32)+'.webp'])assert.equal(bannerOptions({customImage}).customImage,customImage);
 for(const customImage of ['/img/unknown.webp','https://example.com/image.webp','/img/../secret'])assert.throws(()=>bannerOptions({customImage}),/no válido/);
});

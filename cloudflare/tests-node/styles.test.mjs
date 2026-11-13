import {test} from 'node:test';
import fs from 'node:fs';
import postcss from 'postcss';
for(const file of fs.readdirSync('public/css').filter(name=>name.endsWith('.css'))){
 test('CSS con bloques y declaraciones válidos: '+file,()=>{postcss.parse(fs.readFileSync('public/css/'+file,'utf8'),{from:file});});
}

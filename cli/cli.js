#!/usr/bin/env node

if(process.argv.indexOf('-f') > 1){
  require('../dist/read-file.js');
}
else{
  require('../dist/cli.js');
}

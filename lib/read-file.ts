'use strict';

import * as net from 'net';
import * as path from 'path';
import {JSONParser} from "@oresoftware/json-stream-parser";
import * as fs from 'fs';
import Timer = NodeJS.Timer;
import log from './logging';
import {EVCb} from "./bunion";

const f = process.argv[2];

if (!f) {
  throw 'Pass filepath as first arg.';
}

const tryReadingInputFile = (): number => {
  try {
    return fs.openSync(f, 'r');
  }
  catch (err) {
    log.error('Could not open the following file for reading:', f);
    log.error(err.message || err);
    process.exit(1);
  }
};

const fd = tryReadingInputFile();
const budsFile = process.env.bunion_uds_file || '';
const cwd = process.cwd();

const udsFile = budsFile ?
  path.resolve(budsFile) :
  path.resolve(cwd + '/.bunion.sock');

try {
  fs.writeFileSync(udsFile, 'null', {flag: 'wx'});
}
catch (e) {
  // ignore
}

const w = fs.watch(udsFile);

const makeConnection = (cb: EVCb<any>) => {
  
  const conn = net.createConnection(udsFile);
  
  conn.once('error', cb);
  
  conn.once('connect', () => {
    console.log('connected');
    cb(null);
  });
  
  conn.pipe(new JSONParser()).on('data', (d: any) => {
    
    if (d.bunionType && d.bunionType === 'read') {
      return read(d.value);
    }
    
  });
  
};

w.once('change', ev => {
  
  w.close();
  
  makeConnection(err => {
    
    if (!err) {
     return;
    }
  
    setTimeout(() => {
      makeConnection(err => {
        if (err) {
          throw err;
        }
      })
    }, 20);
    
  });
  
});

const con = {
  currentByte: 0,
  prom: Promise.resolve(null),
  dataTo: null as Timer,
  defaultBytesToRead: 50000
};

const read = (v: any) => {
  
  con.prom = con.prom.then(_ => new Promise((resolve) => {
    
    const bytesToRead = v.bytesToRead || con.defaultBytesToRead;
    const curr = con.currentByte;
    const b = Buffer.alloc(bytesToRead);
    
    fs.read(fd, b, 0, bytesToRead, curr, (e, v) => {
      
      const i = b.indexOf(0x00);
      const shortb = b.slice(0, i);
      con.currentByte = curr + shortb.length;
      process.stdout.write(shortb);
      resolve(null);
      
    });
    
  }));
  
};

const dataRead = () => {
  read({bytesToRead: con.defaultBytesToRead});
};

const createTimeout = () => {
  clearTimeout(con.dataTo);
  con.dataTo = setTimeout(dataRead, 25);
};

fs.watch(f, ev => {
  createTimeout();
});




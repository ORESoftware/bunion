'use strict';

import * as net from 'net';
import * as path from 'path';
import {JSONParser} from "@oresoftware/json-stream-parser";
import * as fs from 'fs';
import Timer = NodeJS.Timer;

const f = process.argv[2];

if (!f) {
  throw 'Pass filepath as first arg.';
}

const fd = fs.openSync(f, 'r');
const udsFile = path.resolve(process.env.HOME + '/uds-1.sock');

setTimeout(() => {
  
  const conn = net.createConnection(udsFile);
  
  conn.once('connect', () => {
    console.log('connected');
  });
  
  conn.pipe(new JSONParser()).on('data', (d: any) => {
    
    if (d.bunionType && d.bunionType === 'read') {
      return read(d.value);
    }
    
  });
  
}, 100);

const con = {
  currentByte: 0,
  prom: Promise.resolve(null),
  dataTo: null as Timer
};

const read = (v: any) => {
  
  con.prom.then(_ => new Promise((resolve) => {
    
    const bytesToRead = v.bytesToRead || 50000;
    const curr = con.currentByte;
    const b = Buffer.alloc(bytesToRead);
    
    fs.read(fd, b, 0, bytesToRead, curr, (e, v) => {
      
      const i = b.indexOf(0x00);
      const shortb = b.slice(0, i);
      con.currentByte = curr + shortb.length;
      const s = String(shortb).trim();
      
      for (let line of s.split('\n')) {
        
        const trimmed = String(line || '').trim().replace(/\0/g, ''); // replace null byte
        
        if (trimmed) {
          console.log(trimmed);
        }
        
      }
      
      resolve(null);
      
    })
    
  }));
  
};

const dataRead = () => {
  read({bytesToRead: 50000});
};

const createTimeout = () => {
  clearTimeout(con.dataTo);
  con.dataTo = setTimeout(dataRead, 30);
};

fs.watch(f, ev => {
  createTimeout();
});




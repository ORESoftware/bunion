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

try {
  fs.writeFileSync(udsFile, 'null', {flag: 'wx'});
} catch (e) {
  // ignore
}


const w = fs.watch(udsFile);

w.once('change', ev => {
  
  w.close();
  
  const conn = net.createConnection(udsFile);
  
  conn.once('connect', () => {
    console.log('connected');
  });
  
  conn.pipe(new JSONParser()).on('data', (d: any) => {
    
    if (d.bunionType && d.bunionType === 'read') {
      return read(d.value);
    }
    
  });
  
});


const con = {
  currentByte: 0,
  prom: Promise.resolve(null),
  dataTo: null as Timer,
  prev: ''
};


const read = (v: any) => {
  
  return con.prom = con.prom.then(_ => new Promise((resolve) => {
    
    const bytesToRead = v.bytesToRead || 50000;
    const curr = con.currentByte;
    const b = Buffer.alloc(bytesToRead);
    
    fs.read(fd, b, 0, bytesToRead, curr, (e, v) => {
      
      const i = b.indexOf(0x00);
      const shortb = b.slice(0, i);
      con.currentByte = curr + shortb.length;
      
      // let s = con.prev + String(shortb).trim();
      
      process.stdout.write(shortb);
      
      // const lines = s.split('\n');
      // con.prev = String(lines.pop() || '').trim();
      //
      // console.error('prev:', con.prev);
      //
      // for (let line of lines) {
      //
      //   console.error('line:', line);
      //
      //   const trimmed = String(line || '').trim();
      //   // const trimmed = String(line || '').trim().replace(/\0/g, ''); // replace null byte
      //
      //   if (trimmed) {
      //     process.stdout.write(trimmed + '\n');
      //   }
      //
      // }
      
      resolve(null);
      
    })
    
  }));
  
};

const dataRead = () => {
  read({bytesToRead: 50000});
};

const createTimeout = () => {
  clearTimeout(con.dataTo);
  con.dataTo = setTimeout(dataRead, 25);
};

fs.watch(f, ev => {
  createTimeout();
});




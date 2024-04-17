#!/usr/bin/env node
'use strict';

import * as net from 'net';
import * as path from 'path';
import {JSONParser} from "@oresoftware/json-stream-parser";
import * as fs from 'fs';
import Timer = NodeJS.Timer;
import log from '../logging';
import {EVCb} from "../bunion";
import {producer} from "../loggers";

const fileFlagIndex = process.argv.indexOf('-f');
let fraw = process.env.bxn_file_path || process.argv[fileFlagIndex + 1];

const cwd = process.cwd();
const f = path.isAbsolute(fraw) ? path.resolve(fraw) : path.resolve(cwd + '/' + fraw);

if (!f) {
  throw 'Pass filepath as first arg.';
}

const tryReadingInputFile = (): number => {
  
  // if (f.startsWith('/dev/fd/')) {
  //   return parseInt(f.split('/').pop());
  // }
  
  try {
    return fs.openSync(f, 'r');
  } catch (err) {
    log.error('Could not open the following file for reading:', f);
    log.error("02fd713c-0cbe-41ff-bc47-f957f8ad39e8",  err);
    process.exit(1);
  }
};

const fd = tryReadingInputFile();

// console.log({fd});
// process.exit(0);

const budsFile = process.env.bunion_uds_file || '';

const udsFile = budsFile ?
  path.resolve(budsFile) :
  path.resolve(cwd + '/.bunion.sock');

try {
  fs.writeFileSync(udsFile, 'null', {flag: 'wx'});
} catch (e) {
  // ignore
}

const w = fs.watch(udsFile);

const makeConnection = (cb: EVCb<any>) => {
  
  const conn = net.createConnection(udsFile);
  
  conn.once('error', e => {
    producer.debug('Could not connect to socket:', '\n', e);
    cb(e);
  });
  
  conn.once('connect', () => {
    producer.debug('connected');
    cb(null);
  });
  
  conn.pipe(new JSONParser()).on('data', (d: any) => {
    
    if (d.bunionType && d.bunionType === 'read') {
      return read(d.value);
    }
    
  });
  
};


const con = {
  currentByte: 0,
  prom: Promise.resolve(null),
  dataTo: null as Timer,
  defaultBytesToRead: 50000,
  changeTo: null as Timer,
  changeCount: 0,
  oto: 125
};

const handleConn = () => {
  
  w.close();
  
  setTimeout(() => {
    makeConnection(err => {
      if (err) {
        throw err;
      }
    });
    
  }, 35);
  
};

const setChangeTo = () => {
  if(con.changeTo){
    clearTimeout(con.changeTo as any);
  }
  con.changeTo = setTimeout(handleConn, con.oto -= 10);
};

w.on('change', (ev, f) => {
  
  con.changeCount++;
  
  if (con.changeCount > 5) {
    w.close();
    if(con.changeTo){
      clearTimeout(con.changeTo as any);
    }
    handleConn();
    return;
  }
  
  setChangeTo();
  
});


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
  if(con.dataTo){
    clearTimeout(con.dataTo as any);
  }
  con.dataTo = setTimeout(dataRead, 25);
};

fs.watch(f, ev => {
  createTimeout();
});




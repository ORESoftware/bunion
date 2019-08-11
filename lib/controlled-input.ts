#!/usr/bin/env node
'use strict';

import * as net from 'net';
import * as path from 'path';
import {JSONParser} from "@oresoftware/json-stream-parser";
import * as fs from 'fs';
import Timer = NodeJS.Timer;
import log from './logging';
import {EVCb} from "./bunion";
import {producer} from "./logger";

const cwd = process.cwd();
const budsFile = process.env.bunion_uds_file || '';

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
  clearTimeout(con.changeTo);
  con.changeTo = setTimeout(handleConn, con.oto -= 10);
};

w.on('change', (ev, f) => {
  
  con.changeCount++;
  
  if (con.changeCount > 8) {
    w.close();
    clearTimeout(con.changeTo);
    handleConn();
    return;
  }
  
  setChangeTo();
  
});

const read = (v: any) => {
  createTimeout();
  const bytesToRead = v.bytesToRead || con.defaultBytesToRead;
  console.log('read:' + bytesToRead);
};

const dataRead = () => {
  read({bytesToRead: con.defaultBytesToRead});
};

const createTimeout = () => {
  clearTimeout(con.dataTo);
  con.dataTo = setTimeout(dataRead, 8000);
};

createTimeout();
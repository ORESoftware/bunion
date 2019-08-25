'use strict';

import * as path from "path";
import * as net from "net";
import JSONParser from '@oresoftware/json-stream-parser';
import * as fs from "fs";
import {consumer} from '../logger';
import {ConType} from './con';

export default (budsFile: string, cwd: string, con: ConType) => {
  
  const udsFile = budsFile ?
    path.resolve(budsFile) :
    path.resolve(cwd + '/.bunion.sock');
  
  const connections = new Set<net.Socket>();
  
  const server = net.createServer(c => {
    
    connections.add(c);
    
    c.once('end', () => {
      connections.delete(c);
    });
    
    setTimeout(() => {
      writeReq(c);
    }, 5);
    
    c.pipe(new JSONParser())
      .on('error', e => {
        console.error('client conn error:', e);
      })
      .on('string', s => {
        console.log('string from client:', s);
      })
      .on('data', d => {
        console.log('json from client:', d);
        process.exit(0);
      })
    
  });
  
  const writeToConn = (c: net.Socket, m: object) => {
    return c.write(JSON.stringify(m) + '\n');
  };
  
  const writeReq = (c: net.Socket) => {
    return writeToConn(c, {
      bunionType: 'read',
      value: {
        bytesToRead: 30000
      }
    });
  };
  
  const sendRequestForData = () => {
    clearTimeout(con.dataTo);
    for (const c of connections) {
      writeReq(c);
    }
  };
  
  try {
    fs.unlinkSync(udsFile);
  }
  catch (e) {
    // consumer.warn(e);
  }
  
  server.on('error', e => {
    consumer.warn(e);
  });
  
  server.listen(udsFile, () => {
    consumer.debug('Listening on unix domain socket:', udsFile);
  });
  
  return {
    sendRequestForData,
    connections
  }
  
}
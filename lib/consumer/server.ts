'use strict';

import * as path from "path";
import * as net from "net";
import JSONParser from '@oresoftware/json-stream-parser';
import * as fs from "fs";
import {consumer} from '../loggers';
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
        console.error("09d3eff8-b74c-4f23-a261-ba90c12b931c", 'client conn error:', e);
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
    // ignore
  }
  
  server.on('error', e => {
    consumer.error("5de13abc-2d34-4c1e-af67-7b4944bdd600", e);
  });
  
  server.listen(udsFile, () => {
    consumer.debug('Listening on unix domain socket:', udsFile);
  });
  
  return {
    sendRequestForData,
    connections
  }
  
}
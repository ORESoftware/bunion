'use strict';

const t = {
  
  keys: {
  
    '@bunzo': {
    
      identifyViaRawStr() {
        return true;
      },
    
      identifyViaJSObject(v) {
        return v && v['@bun'] === true;
      },
    
      getValue(v) {
        return v.value;
      },
    
      transformToBunionFormat(v) {
        return {
          '@bunion': true,
          appName: v.appName,
          level: v.level,
          pid: v.pid,
          date: v.date,
          value: this.getValue(v),
          fields: v.fields,
          host: v.host
        }
      }
    },
    
    '@truvia': {
      
      identifyViaRawStr() {
        return true;
      },
      
      identifyViaJSObject(v) {
        // throw new Error('fark');
        return v && v['id'] === '@truvia';
      },
      
      getValue(v) {
        return v.message
      },
      
      transformToBunionFormat(v) {
        return {
          '@bunion': true,
          appName: v.appName,
          level: v.level,
          pid: v.pid,
          date: v.date,
          value: this.getValue(v),
          fields: v.fields,
          host: v.host
        }
      }
    }
  }
  
};


exports.default = {
  
  producer: {
    forceRaw: process.env.bunion_force_raw === 'yes',
    name: 'bob',
    appName: 'foobar',
    level: 'TRACE',
    getHostNameSync() {
      return 'foobarx'
    },
    fields: {
      logStream: 'log-stream',
      logGroup: 'log-group'
    }
  },
  
  consumer: {
    highlightMatches: true,
    level: "TRACE",
    transform: t,
  }
};
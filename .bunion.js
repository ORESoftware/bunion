'use strict';

const t = {
  
  keys: {
    
    foo: {
      identifyViaRawStr() {
        return true;
      },
      identifyViaJSObject(v) {
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
    'name': 'bob',
    'appName': 'foobar',
    'level': 'TRACE',
    getHostNameSync() {
      return 'foobarx'
    }
  },
  
  consumer: {
    'highlightMatches': true,
    'level': "TRACE",
    transform: t,
  }
};
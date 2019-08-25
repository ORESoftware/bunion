
<img align="right" width="20%" height="20%" src="https://raw.githubusercontent.com/oresoftware/bunion/master/media/bunion.png">

<br>

[![Version](https://img.shields.io/npm/v/bunion.svg?colorB=green)](https://www.npmjs.com/package/bunion)

<br>

----

# Bunion / BXN / B4N

> This logging module is ~30% more performant than Bunyan when used as a part of a complete pipeline.

> | Advantages over other loggers like Bunyan
> 1. Has a default logger, configured by `.bunion.js`
> 2. Uses array format instead of object format by default - more readable and more performant
> 3. Has CLI tools for navigating log files

> | Basic API
> 1. Only writes to stdout, not stderr
> 2. Uses an array format by default:
>
>```typescript
>  return safe.stringify([
>    '@bunion',  // the format of the logging line
>    appName,    // your app name
>    level,      // the logging level
>    process.pid,  // the process pid
>    host,         // the hostname where the log originated
>    new Date().toUTCString(),  // a UTC date string
>    fields,     // custom metadata - useful for filtering logs - fields is best used as an object {"xyz":"foo","filter":"on this"}
>    message      // your message, which is an array
>  ]);
> 
>```
>

## | <i> Installation </i>

```bash
 $ npm install bunion
```

## | Usage

```typescript

import log from 'bunion';
log.info('just saying hi.');
log.warn('shit hit the fan', 'part 2');
log.debug('boop', {yep:'this property is on an object'}, {'we can log': {'nested':["objects, also"]}});

```

the above will log this raw data to stdout:

```console
["@bunion","foobar","INFO",10613,"host@you","Sun, 25 Aug 2019 23:05:42 GMT",null,["just saying hi."]]
["@bunion","foobar","WARN",10613,"host@you","Sun, 25 Aug 2019 23:05:42 GMT",null,["shit hit the fan","part 2"]]
["@bunion","foobar","DEBUG",10613,"host@you","Sun, 25 Aug 2019 23:05:42 GMT",null,["boop",{"yep":"this property is on an object"},{"we can log":{"nested":["objects, also"]}}]]

```

----

and then you can read/consume the logs via:

```bash

 $ node foo.js | bunion 

```

Use the following env value for higher performance:

```bash

 $ bunion_max_level=warn node foo.js | bunion --level warn

```

### | Using the bunion config file to setup a default logger

> Use `.bunion.js` in the root of your project or current working directory.

----

<details>
<summary>Default logger configuration</summary>

```typescript

const getDefaultBunionConf = (): BunionConf => {
  return {
    producer: {
      name: 'default',
      appName: 'default',
      forceRaw: false,
      level: 'TRACE',
      inspect: {
        array: {
          length: 25
        },
        object: {
          depth: 5
        }
      },
      fields: {}
    },
    consumer: {
      localeDateString: 'en-US',
      highlightMatches: true,
      level: 'TRACE',
      match: [],
      matchAny: [],
      matchAll: [],
      transform: {
        keys: {}
      }
    }
  }
};

```
</details>


### | How it works:

-----

<details>
<summary>Example 1</summary>

Something like this:

```bash
echo '{"@bunion":true,"level":"WARN","appName":"my-api","date":"08-22-1984","value":"this is the end"}' | bunion

```

Will display this in your terminal:

```console
08-22-1984 app:my-api WARN  this is the end 
```

</details>

----

<details>

<summary>Example 2</summary>

Something like this:
```bash
 echo '["@bunion","app","INFO",333,"host","date-str",null,"message1"]' | bunion

```

Will display this in your terminal:
```console
date-str app:app INFO message1 
```
</details>

-----

<details>

<summary>Example 3</summary>

Something like this:
```bash
 echo '["@bunion","app","INFO",333,"host","date-str",null,["message1","message2",{"foo":"bar"}]]' | bunion

```

Will display this in your terminal:
```console
date-str app:app INFO  message1 message2 {
  foo: 'bar'
} 
```
</details>






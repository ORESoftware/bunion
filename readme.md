
<img align="right" width="20%" height="20%" src="https://raw.githubusercontent.com/oresoftware/bunion/master/media/bunion.png">

<br>

[![Version](https://img.shields.io/npm/v/bunion.svg?colorB=green)](https://www.npmjs.com/package/bunion)

<br>

----

# | Bunion - Bunyan's weird, simpleton cousin. Has more foot-related problems.

> This logging module is ~30% more performant than Bunyan when used as a part of a complete pipeline.

## | <i> Installation </i>

```bash
 $ npm install bunion
```

## | Usage

```typescript

import log from 'bunion';
log.info('just saying hi.');
log.warn('shit hit the fan');
log.error(new Error('foo'));

```

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







<img align="right" width="20%" height="20%" src="https://raw.githubusercontent.com/oresoftware/bunion/master/media/bunion.png">

<br>

[![Version](https://img.shields.io/npm/v/bunion.svg?colorB=green)](https://www.npmjs.com/package/bunion)

<br>

# Bunion - Bunyan's weird, simpleton cousin. Has more foot-related problems.

This logging module is ~25% faster than Bunyan when used as a part of a complete pipeline.
This module is still in development, but should reach 1.0.0 by ~May 15, 2018


## <i> Installation </i>

```bash
$ npm install bunion
```

## Usage

```javascript

import log from 'bunion';
log.info('just saying hi.');
log.warn('shit hit the fan');
log.error(new Error('foo'));

```

and then you can read the logs via:


```bash

 $ node foo.js | bunion --level warn

```

Use the following env value for higher performance:


```bash

 $ bunion_max_level=warn node foo.js | bunion --level warn

```

### Using the bunion config file to setup a default logger

`=> .bunion.json` (TBD)

 Will look a little something like this:

```

{
 "producer":{
 
 },
 "consumer":{
 
 
 }
}
```


### How it works:

Something like this:

```bash
echo '{"@bunion":true,"level":"WARN","appName":"my-api","date":"08-22-1984","value":"this is the end"}' | bunion

```

Will display this in your terminal:

// TBD


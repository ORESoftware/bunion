

# Bunion - Bunyan's weird, simpleton cousin. Has more foot-related problems.


## <i> Installation </i>

```bash
  npm install bunion
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

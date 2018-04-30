
debugger;
import {log, Level} from 'bunion';

log.warn('foo');

const child = log.child().setLevel(Level.INFO);

child.debug('money');

export default 'b';
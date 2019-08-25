'use strict';

import {getConf} from '../utils';

export const bunionConf = getConf();
export const transformKeys = bunionConf.consumer.transform && bunionConf.consumer.transform.keys;
export const transformers = Object.keys(transformKeys || {});
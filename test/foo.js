"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bar_1 = require("./bar");
console.log('bar', bar_1.default);
const Domain = require('domain');
function p1() {
    return new Promise(function (resolve, reject) {
        console.log('this is:', this);
        setTimeout(() => {
            resolve({ name: 'p1' });
        }, 1000);
    });
}
function p2() {
    return new Promise(function (resolve, reject) {
        const d = Domain.create();
        d.once('error', reject);
        d.run(function () {
            console.log('this is:', this);
            setTimeout(() => {
                throw new Error('Failed A2');
                d.removeAllListeners();
                resolve();
            }, 1000);
        });
    });
}
p1().then(res => {
    return p2();
})
    .then(res => {
    console.log(res);
})
    .catch(err => {
    console.warn(err.message);
});

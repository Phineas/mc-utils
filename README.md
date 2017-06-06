# mc-utils
NPM library of useful Minecraft-related utilities

![stable](https://img.shields.io/npm/v/mc-utils.png?style=flat)
[![package](http://img.shields.io/npm/mc-utils.png?style=flat)](https://www.npmjs.org/package/mc-utils)
![downloads](https://img.shields.io/npm/dt/mc-utils.svg?style=flat)

## Install
`npm i --save mc-utils`

## Uses

#### Pinging servers (example):
```js
utils = require('mc-utils');

utils.ping('mc.hypixel.net', 25565, function(err, res) {
  if(err) {
    console.log(err);
  } else {
    console.log(res);
  }
}, 3000);
```
Response: `{ version: { name: 'Requires MC 1.8/1.9/1.10/1.11', protocol: 47 },
  players: { max: 35000, online: 17399, sample: [] },
  description: '            §aHypixel Network §7§c1.8/1.9/1.10/1.11\n              §e§lHUGE MEGA WALLS UPDATE!',
  favicon: '//Favicon png response as base64' }`

#### MOTD Formatting
```js
utils = require('mc-utils');

utils.parseMotD("§5An §dExample §eMOTD!", function(err, result) {
  console.log(result);
});
```

Response: `[ { rules: { color: 'dark-purple' }, motd: 'An ' },
  { rules: { color: 'light-purple' }, motd: 'Example ' },
  { rules: { color: 'yellow' }, motd: 'MOTD!' } ]`

#### UUID -> Name (example):
```js
utils.name('99d68f36-0adb-48fc-a989-e2cc1cec1878', function(err, res) {
  if(err) {
    console.log(err);
  } else {
    console.log(res);
  }
});
```
Response: `{ name: 'Phineas', changedToAt: 1423047291000 }` (changedToAt is the epoch timestamp of when they changed their name to that; if they've never changed their name, it won't be in the object)

#### Name -> UUID (example):
```js
utils = require('mc-utils');

utils.uuid('Phineas', function(err, res) {
  if(err) {
    console.log(err);
  } else {
    console.log(res);
  }
});
```
Response: `{ id: '99d68f360adb48fca989e2cc1cec1878', name: 'Phineas' }`

## Credits
[Cryptkeeper](https://github.com/Cryptkeeper) for the MC ping protocol

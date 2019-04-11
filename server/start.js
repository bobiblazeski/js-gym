const path = require('path');

const express =  require('express');
const staticFile = require('connect-static-file');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const argv = require('minimist')(process.argv.slice(2));

app.use(express.static(path.join(__dirname, '../static/')));
app.use('/dist/agents.browser.js',
  staticFile(process.cwd() + '/dist/agents.browser.js'))

const PORT = 3000;

const mkExample = require('./mk/example');
const SAVE_MK_WEIGHTS = false;
mkExample.start(argv, io, SAVE_MK_WEIGHTS).then(() => {
  server.listen(PORT, () => console.log(`Listening on ${PORT}`));
});











const express = require("express"),
  bodyParser = require("body-parser");

const app = express();

const port = normalizePort(process.env.PORT || 3000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

require('./app/controllers/index')(app);

app.listen(port, () => {
  console.log(`Server online on Port: ${port}`);
});

function normalizePort(port) {
  return parseInt(port);
}

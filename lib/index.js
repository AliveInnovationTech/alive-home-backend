"use strict";


require("./database");
require("mizala-logger");
module.exports = (app, express) => {
    require("./queue")();
    require("./middleware")(app, express);
};

"use strict";


require("./database");
require("mizala-logger");
module.exports = (app, express) => {
    require("./middleware")(app, express);
};

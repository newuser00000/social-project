import { createServer } from "node:http";

import { app } from "./app.js";
import config from "./config/config.js";

const PORT = config.PORT;

const server = createServer(app);

server.listen(PORT, () => {
    console.log(`Backend server listening on port: ${PORT}`);
});

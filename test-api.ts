import express from "express";
import { registerRoutes } from "./server/routes";

// Create a separate express app for API testing
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  const server = await registerRoutes(app);
  const port = 5001; // Use a different port for testing
  
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    console.log(`API testing server running on port ${port}`);
  });
})();
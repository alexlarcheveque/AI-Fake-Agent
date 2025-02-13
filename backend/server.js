require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
const leadRoutes = require("./routes/leadroutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/leads", leadRoutes);
app.use("/api/messages", messageRoutes);

const PORT = process.env.PORT || 3000;

// Sync database and start server
sequelize
  .sync({ alter: true })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error syncing database:", err);
  });

// Export for testing purposes
module.exports = app;

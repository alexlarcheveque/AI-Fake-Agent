const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/webhook", (req, res) => {
  console.log("Received webhook:", req.body);
  res.status(200).send("OK");
});

app.listen(3001, () => {
  console.log("Test server running on port 3001");
});

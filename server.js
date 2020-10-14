require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 8080;

const initAuthAPIs = require("./routes/api-auth.route");
const initMainAPIs = require("./routes/api-main.route");

mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log("connected to database"))
	.catch((error) => console.log("error occured", error));

const corsConfig = {
	origin: process.env.CLIENT_URI,
	credentials: true,
};

app.use(cors(corsConfig));
app.options("*", cors(corsConfig));

app.use(cookieParser(process.env.COOKIE_SECRET));

// parser application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parser application/json
app.use(bodyParser.json());

initAuthAPIs(app);
initMainAPIs(app);
app.get("/", (req, res) => {
	res.redirect("/api");
});

app.get("/api", (req, res) => {
	res.send({
		message: "room-split-api",
	});
});

app.listen(port, () => {
	console.log(`started server!`);
});

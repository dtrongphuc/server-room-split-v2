var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var roomSchema = new Schema(
	{
		code: String,
		name: String,
		price: Number,
		memberCount: Number,
		otherPrice: Number,
	},
	{ versionKey: false }
);

var Room = mongoose.model("Room", roomSchema, "room");

module.exports = Room;

var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var billSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: "user",
			required: true,
		},
		room: {
			type: Schema.Types.ObjectId,
			ref: "room",
			required: true,
		},
		month: Number,
		year: Number,
		expense: Number,
	},
	{ versionKey: false }
);

var Bill = mongoose.model("Bill", billSchema, "bill");

module.exports = Bill;

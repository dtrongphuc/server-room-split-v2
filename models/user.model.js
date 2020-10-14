var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema(
	{
		room: {
			type: Schema.Types.ObjectId,
			ref: "Room",
			required: false,
		},
		username: String,
		password: String,
		realname: String,
	},
	{ versionKey: false }
);

var User = mongoose.model("User", userSchema, "user");

module.exports = User;

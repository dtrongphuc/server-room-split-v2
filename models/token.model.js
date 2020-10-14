const mongooose = require("mongoose");
var Schema = mongooose.Schema;

var tokenSchema = new Schema(
	{
		tokenList: Array,
	},
	{ versionKey: false }
);

var Token = new mongooose.model("Token", tokenSchema, "token");

module.exports = Token;

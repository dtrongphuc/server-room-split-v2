const mongooose = require('mongoose');
var Schema = mongooose.Schema;

var tokenSchema = new Schema(
	{
		accessToken: String,
		refreshToken: String,
		createdAt: { type: Date, default: Date.now },
	},
	{ versionKey: false }
);

var Token = new mongooose.model('Token', tokenSchema, 'token');

module.exports = Token;

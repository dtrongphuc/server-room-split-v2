const mongooose = require('mongoose');
var Schema = mongooose.Schema;

var tokenSchema = new Schema(
	{
		accessToken: String,
		refreshToken: String,
		createdAt: {
			type: Date,
			default: Date.now,
			expires: parseInt(process.env.TOKEN_EXPIRES),
		},
	},
	{ versionKey: false, useCreateIndex: true }
);

var Token = new mongooose.model('Token', tokenSchema, 'token');

module.exports = Token;

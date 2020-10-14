var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var purchaseSchema = new Schema(
	{
		user: Object,
		room: {
			type: Schema.Types.ObjectId,
			ref: "room",
		},
		date: Date,
		productName: String,
		price: Number,
		quantity: Number,
		totalPrice: Number,
		members: Array,
	},
	{ versionKey: false }
);

var Purchase = mongoose.model("Purchase", purchaseSchema, "purchase");

module.exports = Purchase;

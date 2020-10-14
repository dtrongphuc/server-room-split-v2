exports.postPurchase = (req, res, next) => {
	const {
		userID,
		productName,
		productPrice,
		productQuantity,
		productDate,
	} = req.body;

	if (
		!userID ||
		!productName ||
		!productPrice ||
		!productQuantity ||
		!productDate
	) {
		return res.status(403).send({
			success: false,
			error: {
				message: "Input is empty.",
			},
		});
	}

	next();
};

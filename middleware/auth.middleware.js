const jwtHelper = require("../helpers/jwt.helper");

const accessTokenSecret =
	process.env.ACCESS_TOKEN_SECRET || "access-token-secret";

exports.isAuth = async (req, res, next) => {
	const tokenFromClient =
		req.headers["cookie"] ||
		req.body.token ||
		req.query.token ||
		req.headers["x-access-token"];
	const refreshTokenFromClient =
		tokenFromClient && tokenFromClient.split(/[\=\;]/)[1];
	const accessTokenFromClient =
		tokenFromClient && tokenFromClient.split(/[\=\;]/)[3];
	if (tokenFromClient && accessTokenFromClient) {
		try {
			// Giải mã xem token có hợp lệ không ?
			const decoded = await jwtHelper.verifyToken(
				accessTokenFromClient,
				accessTokenSecret
			);
			// Lưu thông tin giải mã được vào đối tượng req
			req.jwtDecoded = decoded;
			next();
		} catch (error) {
			return res.status(401).send({
				success: false,
				error: {
					message: "Unauthorized.",
				},
			});
		}
	} else if (refreshTokenFromClient) {
		return res.status(307).send({
			success: false,
			error: {
				message: "Token expired.",
			},
		});
	} else {
		// Không tồn tại token trong request
		console.log("Không tồn tại token trong request");
		return res.status(401).send({
			success: false,
			error: {
				message: "No token provided.",
			},
		});
	}
};

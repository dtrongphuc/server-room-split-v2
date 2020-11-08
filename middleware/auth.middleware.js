const jwtHelper = require('../helpers/jwt.helper');

const accessTokenSecret =
	process.env.ACCESS_TOKEN_SECRET || 'access-token-secret';

exports.isAuth = async (req, res, next) => {
	const { accessToken, refreshToken } = req.cookies;
	if (accessToken) {
		try {
			// Giải mã xem token có hợp lệ không ?
			const decoded = await jwtHelper.verifyToken(
				accessToken,
				accessTokenSecret
			);
			// Lưu thông tin giải mã được vào đối tượng req
			req.jwtDecoded = decoded;
			next();
		} catch (error) {
			return res.status(403).json({
				success: false,
				error: {
					message: 'Chưa xác thực',
				},
			});
		}
	} else if (!!refreshToken) {
		return res.status(401).json({
			success: false,
			error: {
				message: 'Token expired',
			},
		});
	} else {
		// Không tồn tại token trong request
		console.log('Không tồn tại token trong request');
		return res.status(403).json({
			success: false,
			error: {
				message: 'No token provided',
			},
		});
	}
};

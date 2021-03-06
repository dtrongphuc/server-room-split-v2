const bcrypt = require('bcrypt');
const moment = require('moment');

const jwtHelper = require('../helpers/jwt.helper');
var randomize = require('randomatic');
var User = require('../models/user.model');
var Room = require('../models/room.model');
var Token = require('../models/token.model');
var Bill = require('../models/bill.model');

const accessTokenSecret =
	process.env.ACCESS_TOKEN_SECRET || 'access-token-secret-@dtrongphuc';
const accessTokenLife = process.env.ACCESS_TOKEN_LIFE || '3days';

const refreshTokenSecret =
	process.env.REFRESH_TOKEN_SECRET || 'refresh-token-secret-@dtrongphuc';
const refreshTokenLife = process.env.REFRESH_TOKEN_LIFE || '3650days';

let createBill = async (username, roomId, month, year) => {
	try {
		let user = await User.findOne({ username });
		if (user) {
			await Bill.create({
				user: user._id,
				room: roomId,
				month: month,
				year: year,
				expense: 0,
			});
		}
	} catch (error) {
		throw new error(error);
	}
};

let saveToken = async (accessToken, refreshToken) => {
	try {
		if ((!accessToken, !refreshToken)) {
			throw new Error('Không đủ dữ liệu');
		}

		await Token.create({
			accessToken,
			refreshToken,
		});
	} catch (err) {}
};

let logout = async (req, res) => {
	const { accessToken, refreshToken } = req.cookies;
	try {
		if (!!refreshToken) {
			await Token.deleteOne({ refreshToken });
		}
	} catch (err) {
		console.log(err);
		return res.status(500).json(err);
	}

	res.clearCookie('accessToken');
	res.clearCookie('refreshToken');
	res.status(200).json({ success: true });
};

let login = async (req, res) => {
	try {
		var accessToken;
		var refreshToken;

		User.findOne({
			username: req.body.username,
		})
			.populate('room')
			.then((data) => {
				const decoded = {
					_id: data._id,
					username: data.username,
					realname: data.realname,
					room: data.room._id,
					active: data.active,
				};
				accessToken = jwtHelper.generateToken(
					decoded,
					accessTokenSecret,
					accessTokenLife
				);

				refreshToken = jwtHelper.generateToken(
					decoded,
					refreshTokenSecret,
					refreshTokenLife
				);

				Promise.all([accessToken, refreshToken]).then(
					async (values) => {
						[accessToken, refreshToken] = values;
						await saveToken(accessToken, refreshToken);

						res.setHeader('Cache-Control', 'private');

						res.cookie('refreshToken', refreshToken, {
							httpOnly: true,
							maxAge: parseInt(refreshTokenLife),
							sameSite: 'none',
							secure: true,
						});

						res.cookie('accessToken', accessToken, {
							httpOnly: true,
							maxAge: parseInt(accessTokenLife),
							sameSite: 'none',
							secure: true,
						});
						return res.status(200).json({
							success: true,
							user: { ...decoded },
						});
					}
				);
			})
			.catch(async (error) => {
				await User.deleteOne({ username: req.body.username });

				return res.status(403).json({
					success: false,
					error: {
						message:
							'Tài khoản chưa tham gia phòng, vui lòng đăng ký lại',
					},
				});
			});
	} catch (error) {
		return res.status(500).json(error);
	}
};

let register = async (req, res) => {
	try {
		const { username, password, realname } = req.body;

		let hashPassword = bcrypt.hashSync(password, 10);

		await User.create({
			username,
			realname,
			password: hashPassword,
			active: true,
		});

		let user = await User.findOne({ username }, '-password');

		return res.status(200).json({
			user: {
				...user.toObject(),
				room: '',
			},
			success: true,
			error: {
				messeage: 'Đăng ký thành công',
			},
		});
	} catch (error) {
		return res.status(403).json({
			success: false,
			error: {
				messeage: error || 'Đã có lỗi xảy ra',
			},
		});
	}
};

let joinRoom = (req, res) => {
	try {
		const { username, roomCode } = req.body;

		Room.findOne({ code: roomCode }).then(async (room) => {
			if (!room) {
				return res.status(403).json({
					success: false,
					error: {
						messeage: 'Mã phòng không tồn tại',
					},
				});
			}

			await createBill(
				username,
				room._id,
				moment().format('M'),
				moment().format('YYYY')
			);

			await Room.findByIdAndUpdate(
				room._id,
				{
					$set: {
						memberCount: room.memberCount + 1,
					},
				},
				{
					useFindAndModify: false,
				}
			);

			await User.findOneAndUpdate(
				{ username: username },
				{ room: room._id },
				{ useFindAndModify: false }
			);

			return login(req, res);
		});
	} catch (error) {
		return res.status(500).json(error);
	}
};

let createRoom = async (req, res) => {
	try {
		const { username, roomName, price, otherPrice } = req.body;

		let roomCode;
		let isMatch;

		do {
			roomCode = randomize('0', 10);
			isMatch = await Room.findOne({ code: roomCode }).exec();
		} while (isMatch);

		const room = new Room({
			name: roomName,
			code: roomCode,
			price: price,
			memberCount: 1,
			otherPrice: otherPrice,
		});
		const newRoom = await room.save();
		if (newRoom) {
			await createBill(
				username,
				newRoom._id,
				moment().format('M'),
				moment().format('YYYY')
			);

			User.findOneAndUpdate(
				{ username },
				{ room: newRoom._id },
				{ useFindAndModify: false }
			).then(() => {
				return login(req, res);
			});
		}
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: {
				message: 'Có lỗi xảy ra',
			},
		});
	}
};

let refreshToken = async (req, res) => {
	const { refreshToken } = req.cookies;
	const token = await Token.findOne({ refreshToken });

	if (refreshToken && token) {
		try {
			var accessToken;
			jwtHelper
				.verifyToken(refreshToken, refreshTokenSecret)
				.then(async (decoded) => {
					accessToken = await jwtHelper.generateToken(
						decoded.data,
						accessTokenSecret,
						accessTokenLife
					);
					res.cookie('accessToken', accessToken, {
						httpOnly: true,
						maxAge: parseInt(accessTokenLife),
						sameSite: 'none',
						secure: true,
					});

					return res.status(200).json({ accessToken });
				});
		} catch (error) {
			res.status(403).json({
				messeage: 'Refresh token không hợp lệ',
			});
		}
	} else {
		return res.status(500).json({
			success: false,
			error: {
				message: 'Có lỗi xảy ra',
			},
		});
	}
};

let isAuth = async (req, res) => {
	const { accessToken } = req.cookies;
	try {
		const decoded = await jwtHelper.verifyToken(
			accessToken,
			accessTokenSecret
		);
		req.jwtDecoded = decoded;
		const userId = decoded.data._id;
		const { active } = await User.findById(userId);
		return res.status(200).json({
			success: true,
			user: {
				...decoded.data,
				active,
			},
		});
	} catch (error) {
		return res.status(403).json({
			success: false,
			error: {
				message: 'Chưa xác thực',
			},
		});
	}
};

module.exports = {
	login,
	logout,
	register,
	joinRoom,
	createRoom,
	refreshToken,
	isAuth,
};

const bcrypt = require('bcrypt');
const Room = require('../models/room.model');
const User = require('../models/user.model');

function isEmpty(str) {
	return !str || str.length === 0;
}

exports.postLogin = async (req, res, next) => {
	let username = req.body.username;
	let password = req.body.password;

	let user = await User.findOne({ username: username });
	if (!user) {
		return res.status(403).send({
			success: false,
			error: {
				message: 'Tài khoản chưa tồn tại .',
			},
		});
	}

	const match = await bcrypt.compare(password, user.password);

	if (!match) {
		return res.status(403).send({
			success: false,
			error: {
				message: 'Tên tài khoản hoặc mật khẩu chưa đúng.',
			},
		});
	}
	next();
};

exports.postRegister = (req, res, next) => {
	let username = req.body.username;
	let password = req.body.password;
	let repassword = req.body.passwordConfirm;
	let realname = req.body.realname;

	try {
		User.findOne({ username: username }).then((user) => {
			if (user) {
				return res.status(406).send({
					success: false,
					error: {
						message: 'Tên tài khoản đã tồn tại.',
					},
				});
			} else if (
				isEmpty(username) ||
				isEmpty(password) ||
				isEmpty(repassword) ||
				isEmpty(realname)
			) {
				return res.status(406).send({
					success: false,
					error: {
						message: 'Dữ liệu rỗng.',
					},
				});
			} else if (password != repassword) {
				return res.status(406).send({
					success: false,
					error: {
						message: 'Mật khẩu xác nhận không đúng.',
					},
				});
			} else {
				next();
			}
		});
	} catch (error) {
		return res.status(403).send({
			success: false,
			error: {
				message: `${error}` || 'Error.',
			},
		});
	}
};

exports.postJoinRoom = (req, res, next) => {
	try {
		let roomCode = req.body.code;
		Room.findOne({ code: roomCode }).then((room) => {
			if (!room) {
				return res.status(404).send({
					success: false,
					error: {
						message: 'Room code is not exist.',
					},
				});
			}
			next();
		});
	} catch (error) {
		return res.status(500).json(error);
	}
};

exports.postCreateRoom = (req, res, next) => {
	try {
		let roomName = req.body.roomName;
		let price = req.body.price;

		if (isEmpty(roomName) || isEmpty(price.toString())) {
			return res.status(403).send({
				success: false,
				error: {
					message: 'Input is empty.',
				},
			});
		} else {
			next();
		}
	} catch (error) {
		return res.status(500).json(error);
	}
};
